"""
Ledger & Lot - Land Registry Market Value Updater v2.4
========================================================
Fixes a critical flaw in v1: the original script averaged sold prices across
ALL property types per postcode district (houses + flats + everything else
blended together). This systematically overstates the value of flats in
districts dominated by house sales -- exactly the "#1 BMV scam" red flag
identified in an independent property audit (28 July 2026, WA7 Castleview
House flats, both showing false 85.1% BMV badges as a result).

WHAT'S NEW IN v2.4 (this patch, for unattended daily runs):
- FIXED: only the first 1,000 deals were ever fetched. Supabase returns at
  most 1,000 rows per request and the old single GET never asked for more,
  so every deal beyond the first 1,000 silently kept its old valuation
  (the 25 Nov 2026 manual run processed exactly 1,000 of 1,224 deals).
  Deals are now fetched page by page until none are left.
- By default only LIVE deals are revalued (not archived, stage not
  'completed', no hammer price recorded). Finished auctions keep the
  prediction they were validated against. Run with --all to revalue
  every deal, as v2.3 did.
- ppd_data.csv.gz is read directly if present, so the data file can live
  in the repo compressed.
- Safety stops for unattended runs: refuses to write anything if the
  price-paid file looks truncated, and exits with an error if any update
  fails so the GitHub Action shows red instead of silently half-finishing.
- Fixed the invalid "\\d" escape SyntaxWarning in this docstring.

WHAT'S NEW IN v2.3:
- Switched district averaging from MEAN to MEDIAN. With a smaller,
  year-to-date comps file, a single outlier sale (new-build premium,
  misrecorded price, one-off luxury transaction) could drag a whole
  district's "average" far above what's realistic. Median is far more
  resistant to this.
- Added "chambers" to FLAT_BUILDING_HINTS. Addresses like "24 Warwick
  Chambers, Pater Street, Kensington" are flat conversions but were
  defaulting to "house" and being priced against actual house sales,
  producing wildly inflated valuations. Deliberately did NOT add
  broader words like "manor" or "place" since those appear constantly
  in genuine house street names (e.g. "Manor Road", "Market Place")
  and would misclassify real houses as flats.
- Fixed market_value_source never being written for regular (non
  multi-unit, non-non-residential) deals. The script was correctly
  recalculating market_value each run but leaving the OLD source label
  in place, so the database could show a deal as "estimated_fallback"
  long after it had actually been revalued against real comps. Now
  every branch explicitly sets market_value_source: 'land_registry_comp'
  for confident type-specific matches, 'blended_district_fallback' for
  the low-sample-size fallback (previously mislabeled the same as the
  old flat 25%-markup fallback), and 'no_match' when there's no comp
  data at all for that district.

WHAT'S NEW IN v2.2:
- Block/bulk discount factor for multi-unit lots. The naive v2.1 approach
  (per-unit comp x unit count) still badly OVERSHOT on real results:
    - "1-10 Nissa Ashram, 66a Fernley Road, Birmingham" (10 units)
      -> naive estimate ~207% ABOVE hammer price (£675k)
  Block/portfolio buyers pay a discount to the sum of retail per-unit
  comps -- refurb risk, a smaller buyer pool able to take down a whole
  freehold in one go, and the cost/time of splitting title and selling
  units individually all suppress the price below "per-unit x count".
  block_discount_factor() applies a tiered discount based on unit_count.
  NOTE: these tiers are a starting estimate calibrated against ONE
  validated result (Nissa Ashram). Treat as directional, not precise,
  until more multi-unit auction results are validated against it --
  re-run against the 28-29 July 2026 Savills batch and adjust the tiers
  once prediction_accuracy_pct comes back for more multi-unit lots.
  market_value_source is now 'multi_unit_block_estimate_discounted' so
  discounted estimates are distinguishable from the old undiscounted ones.

WHAT'S NEW IN v2.1:
- Multi-unit lot detection. The 28-29 July 2026 Savills auction validation
  showed the model underestimated two lots sold as multiple self-contained
  units under one freehold by 60-70%:
    - "Flats 1-5, 165 Chatham Street, Liverpool"   -> predicted £160k, hammer £409k
    - "1-10 Nissa Ashram, 66a Fernley Road, Birmingham" -> predicted £207k, hammer £675k
  This was happening because the script priced these addresses as a SINGLE
  unit against the district's per-flat average, never multiplying by the
  number of units actually being sold in the lot.
  Multi-unit lots are now detected from the address text BEFORE the
  non-residential check runs (an address like "Units 3-8 Warehouse Court"
  would otherwise be caught by the "units?" plus a digit non-residential pattern and
  wrongly treated as commercial/land). Detected lots get:
    - market_value = per-unit type average x unit count x block discount
      (v2.2: was a pure floor estimate in v2.1, now discounted -- see above)
    - market_value_source = 'multi_unit_block_estimate_discounted'
    - data_quality_flag = 'multi_unit_needs_manual_valuation'
    - property_type_inferred records the base type AND the unit count,
      e.g. 'flat_multi_unit_x5', so it's visible without a schema change.

WHAT v2 ALREADY DID:
- Reads the property type column from the PPD file (D/S/T/F/O) and builds
  SEPARATE averages per (postcode district, property type).
- Infers each deal's likely property type from its address text:
  - Land parcels / commercial units -> NOT valued against residential
    comps at all (no meaningful comparison exists). market_value left
    NULL, flagged for manual valuation.
  - Flats/apartments/units in named buildings -> compared only against
    OTHER FLATS sold in that district.
  - Everything else -> compared only against HOUSES (semi/terraced/
    detached combined, flats excluded) sold in that district.
- If there's not enough sale data for the specific type in a district
  (fewer than 3 sales), falls back to the old whole-district blended
  average AND flags the deal for manual review rather than silently
  guessing.
- Writes property_type_inferred to the database so you can always see
  WHY a valuation was calculated the way it was.
- Never overwrites flags that were set manually or by other checks
  (e.g. 'overpriced', 'suspicious_low_price') -- only manages its own
  flags, so nothing you've already reviewed gets clobbered.

REQUIREMENTS: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set as environment
variables, ppd_data.csv (or ppd_data.csv.gz) in the same folder as this
script, requests installed.

USAGE:  python update_market_values.py          (live deals only)
        python update_market_values.py --all    (every deal)
"""

import csv
import gzip
import os
import re
import sys
import statistics
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
_HERE = os.path.dirname(os.path.abspath(__file__))
PPD_FILE = os.path.join(_HERE, "ppd_data.csv")
if not os.path.exists(PPD_FILE) and os.path.exists(PPD_FILE + ".gz"):
    PPD_FILE = PPD_FILE + ".gz"
ALL_DEALS = "--all" in sys.argv   # default: live deals only
PAGE_SIZE = 1000                  # Supabase returns at most 1,000 rows per request
MIN_DISTRICTS = 1000              # sanity floor: a healthy PPD file gives ~2,000+ per type
ERRORS = 0
DEALS_TABLE = "deals"
MIN_SAMPLE_SIZE = 3  # minimum sales needed to trust a type-specific average

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables.")
    sys.exit(1)

if not os.path.exists(PPD_FILE):
    print(f"ERROR: Could not find {PPD_FILE}")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

# Flags this script is allowed to set/clear on its own. Any OTHER flag
# (e.g. one you set manually, or 'overpriced', 'suspicious_low_price')
# is left completely untouched.
SCRIPT_MANAGED_FLAGS = {
    "pending_property_type_reverification",
    "inflated_district_average_flat_vs_house_mix",
    "low_sample_size_type_specific_fallback_used",
    "non_residential_property_needs_manual_valuation",
    "land_parcel_no_residential_comp",
    "multi_unit_needs_manual_valuation",
}

NON_RESIDENTIAL_PATTERNS = re.compile(
    r"\b(land at|land to the rear|land north|land south|land east|land west|"
    r"industrial estate|industrial park|warehouse|commercial|retail unit|"
    r"office|units? \d|business park|storage)\b", re.IGNORECASE
)
FLAT_PATTERNS = re.compile(
    # NEW in v2.1: plural forms added (flats?, apartments?, etc.) -- the
    # singular-only version was misclassifying "Flats 1-5, ..." as a house,
    # which would have doubled the multi-unit valuation error by pricing
    # against house comps instead of flat comps.
    r"\b(flats?|apartments?|apt\.?s?|maisonettes?|penthouses?)\b", re.IGNORECASE
)
# Building names commonly (not always) indicating flats/blocks rather than
# a single house -- weaker signal, used only as secondary evidence.
# v2.3: added "chambers" (validated against "24 Warwick Chambers, Pater
# Street, Kensington" being wrongly priced as a house). Deliberately did
# NOT add "manor", "place", "hall", "villas" etc -- those show up
# constantly in genuine house street names and would create false
# positives (e.g. "209 Manor Road", "4 Market Place").
FLAT_BUILDING_HINTS = re.compile(
    r"\b(house|court|lodge|heights|mansions|point|tower|wharf|gate|chambers)\b,", re.IGNORECASE
)

# --- multi-unit lot detection (v2.1) ------------------------------------
MULTI_UNIT_PATTERNS = [
    # "Flats 1-5", "Flat 1-5", "Units 1-10", "Apartments 3-8"
    re.compile(r"\b(?:flats?|units?|apartments?)\s+(\d+)\s*-\s*(\d+)\b", re.IGNORECASE),
    # Leading numeric range before a building name, e.g. "1-10 Nissa Ashram"
    re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s+[A-Za-z]"),
]

def detect_multi_unit(address):
    """
    Inspects a listing address for signs it covers multiple self-contained
    units sold as a single freehold lot (a block, not a single flat/house).
    Returns (is_multi_unit: bool, unit_count: int, pattern_matched: str|None)
    """
    if not address:
        return False, 1, None
    for pattern in MULTI_UNIT_PATTERNS:
        match = pattern.search(address)
        if match:
            start, end = int(match.group(1)), int(match.group(2))
            if end > start:  # guards against false positives (e.g. postcodes)
                return True, (end - start) + 1, match.group(0)
    return False, 1, None

# --- block/bulk discount for multi-unit lots (v2.2) ---------------------
# Multi-unit lots bought as a single freehold typically sell at a discount
# to the sum of retail per-unit comps. These tiers are a starting estimate
# based on ONE validated result (10-unit Nissa Ashram lot, naive estimate
# was +207% above hammer price) -- treat as directional, not precise, until
# more multi-unit auction results validate/refine it.
def block_discount_factor(unit_count):
    """Returns a multiplier (0-1) applied to the naive per-unit x count estimate."""
    if unit_count <= 1:
        return 1.0
    elif unit_count <= 3:
        return 0.85   # -15%
    elif unit_count <= 6:
        return 0.75   # -25%
    elif unit_count <= 10:
        return 0.65   # -35%
    elif unit_count <= 15:
        return 0.55   # -45%
    else:
        return 0.50   # -50%, capped
# ------------------------------------------------------------------------

def extract_postcode_district(postcode):
    if not postcode:
        return None
    postcode = postcode.strip().upper()
    match = re.match(r"^([A-Z]{1,2}\d{1,2}[A-Z]?)", postcode)
    return match.group(1) if match else None

# A lot description opens with lines like "One bedroom first floor flat" or
# "Split level three bedroom maisonette". Only the first few lines are checked,
# and lines about blocks, shops, offices or "flats" (plural) are ignored.
_NOTES_FLAT = re.compile(
    r"^(?:an?\s+)?(?:one|two|three|four|five|six|studio|ground|first|second|third|fourth|fifth|top|split|lower|upper)\b[^|]*\b(?:flat|maisonette|apartment)\b",
    re.I,
)
_NOTES_NOT_A_SINGLE_FLAT = re.compile(r"\b(?:flats|block|building|shop|office|commercial|retail|mixed)\b", re.I)

def notes_say_flat(notes):
    if not notes:
        return False
    for line in [s.strip() for s in notes.split("|")][:4]:
        if _NOTES_FLAT.search(line) and not _NOTES_NOT_A_SINGLE_FLAT.search(line):
            return True
    return False

def infer_property_type(address):
    """Returns 'non_residential', 'flat', or 'house' based on address text."""
    if not address:
        return "house"  # default assumption, weakest confidence
    if NON_RESIDENTIAL_PATTERNS.search(address):
        return "non_residential"
    if FLAT_PATTERNS.search(address):
        return "flat"
    if FLAT_BUILDING_HINTS.search(address):
        return "flat"  # weaker signal, e.g. "81 Castleview House, East Lane,"
    if notes_say_flat(NOTES_BY_ADDRESS.get(address)):
        return "flat"  # the lot description says flat/maisonette/apartment
    return "house"

def build_type_aware_averages():
    """
    Returns three dicts keyed by postcode district:
      flat_avgs[district]   -> (median_price, sample_count)
      house_avgs[district]  -> (median_price, sample_count)   [S+T+D combined]
      blended_avgs[district] -> (median_price, sample_count) [all types, fallback]

    v2.3: switched from mean to median. With the 2026-only comps file
    (~9 months of sales, far smaller than the old multi-year file), a
    plain mean let a single outlier sale (a new-build, a misrecorded
    price, a one-off luxury transaction) drag an entire district's
    "average" far above what's realistic -- e.g. W8 showing a market
    value 12x the asking price. Median is far more resistant to this.
    """
    flat_prices, house_prices, blended_prices = {}, {}, {}

    print(f"Reading {PPD_FILE} ...")
    opener = gzip.open if PPD_FILE.endswith(".gz") else open
    with opener(PPD_FILE, "rt", newline="", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        row_count = 0
        for row in reader:
            row_count += 1
            if len(row) < 5:
                continue
            try:
                price = float(row[1])
            except (ValueError, IndexError):
                continue
            postcode = row[3]
            prop_type = row[4].strip().upper() if row[4] else ""
            district = extract_postcode_district(postcode)
            if not district:
                continue

            blended_prices.setdefault(district, []).append(price)

            if prop_type == "F":
                flat_prices.setdefault(district, []).append(price)
            elif prop_type in ("S", "T", "D"):
                house_prices.setdefault(district, []).append(price)

    print(f"Processed {row_count} rows.")

    flat_avgs = {d: (statistics.median(v), len(v)) for d, v in flat_prices.items()}
    house_avgs = {d: (statistics.median(v), len(v)) for d, v in house_prices.items()}
    blended_avgs = {d: (statistics.median(v), len(v)) for d, v in blended_prices.items()}

    print(f"Built flat-specific averages for {len(flat_avgs)} districts.")
    print(f"Built house-specific averages for {len(house_avgs)} districts.")
    return flat_avgs, house_avgs, blended_avgs

# lot descriptions, keyed by address, so infer_property_type can read them
NOTES_BY_ADDRESS = {}

def is_live(deal):
    """Live = not archived, not a finished auction, no recorded hammer price."""
    if deal.get("archived_at") is not None:
        return False
    if (deal.get("stage") or "").strip().lower() == "completed":
        return False
    if deal.get("hammer_price") is not None:
        return False
    return True

def fetch_deals():
    cols = "id,postcode,asking_price,market_value,address,data_quality_flag,notes,stage,hammer_price,archived_at"
    deals, offset = [], 0
    while True:
        url = (f"{SUPABASE_URL}/rest/v1/{DEALS_TABLE}?select={cols}"
               f"&order=id.asc&limit={PAGE_SIZE}&offset={offset}")
        resp = requests.get(url, headers=HEADERS, timeout=60)
        resp.raise_for_status()
        page = resp.json()
        deals.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    total = len(deals)
    if not ALL_DEALS:
        deals = [d for d in deals if is_live(d)]
    for d in deals:
        if d.get("address"):
            NOTES_BY_ADDRESS[d["address"]] = d.get("notes")
    print(f"Fetched {total} deals in total; revaluing {len(deals)} "
          f"({'all deals' if ALL_DEALS else 'live deals only'}).")
    return deals

def update_deal(deal_id, payload):
    global ERRORS
    url = f"{SUPABASE_URL}/rest/v1/{DEALS_TABLE}?id=eq.{deal_id}"
    try:
        resp = requests.patch(url, headers=HEADERS, json=payload, timeout=60)
        resp.raise_for_status()
    except requests.RequestException as exc:
        ERRORS += 1
        print(f"ERROR updating deal {deal_id}: {exc}")

def main():
    flat_avgs, house_avgs, blended_avgs = build_type_aware_averages()
    if len(flat_avgs) < MIN_DISTRICTS or len(house_avgs) < MIN_DISTRICTS:
        print(f"ERROR: price-paid data looks incomplete ({len(flat_avgs)} flat districts, "
              f"{len(house_avgs)} house districts; expected {MIN_DISTRICTS}+). No deals were changed.")
        sys.exit(1)
    deals = fetch_deals()
    if not deals:
        print("Nothing to revalue.")
        return

    stats = {"flat_matched": 0, "house_matched": 0, "blended_fallback": 0,
              "non_residential_skipped": 0, "no_match": 0, "multi_unit_flagged": 0}

    for deal in deals:
        deal_id = deal.get("id")
        postcode = deal.get("postcode")
        asking_price = deal.get("asking_price")
        address = deal.get("address")
        current_flag = deal.get("data_quality_flag")

        district = extract_postcode_district(postcode) if postcode else None
        can_touch_flag = (current_flag is None) or (current_flag in SCRIPT_MANAGED_FLAGS)

        # Check multi-unit BEFORE non-residential, so lots like
        # "Units 3-8 Warehouse Court" don't get wrongly caught by the
        # commercial "units? \d" pattern in NON_RESIDENTIAL_PATTERNS.
        is_multi_unit, unit_count, pattern_matched = detect_multi_unit(address)
        prop_type = infer_property_type(address)

        payload = {"property_type_inferred": prop_type}

        if is_multi_unit:
            type_avgs = flat_avgs if prop_type == "flat" else house_avgs
            payload["property_type_inferred"] = f"{prop_type}_multi_unit_x{unit_count}"

            if district and district in type_avgs and type_avgs[district][1] >= MIN_SAMPLE_SIZE:
                per_unit_value, sample = type_avgs[district]
                discount = block_discount_factor(unit_count)
                naive_estimate = round(per_unit_value * unit_count, 2)
                block_estimate = round(naive_estimate * discount, 2)
                payload["market_value"] = block_estimate
                payload["market_value_source"] = "multi_unit_block_estimate_discounted"
            else:
                discount = None
                naive_estimate = None
                payload["market_value"] = None
                payload["market_value_source"] = "multi_unit_no_reliable_comp"

            if can_touch_flag:
                payload["data_quality_flag"] = "multi_unit_needs_manual_valuation"
            stats["multi_unit_flagged"] += 1
            update_deal(deal_id, payload)
            if naive_estimate is not None:
                print(f"Deal {deal_id}: MULTI-UNIT LOT ({pattern_matched}, {unit_count} units) -- "
                      f"naive={naive_estimate}, discount={discount}, "
                      f"market_value={payload.get('market_value')}, flagged for manual review")
            else:
                print(f"Deal {deal_id}: MULTI-UNIT LOT ({pattern_matched}, {unit_count} units) -- "
                      f"no reliable comp, flagged for manual review")
            continue

        if prop_type == "non_residential":
            payload["market_value"] = None
            if can_touch_flag:
                payload["data_quality_flag"] = "non_residential_property_needs_manual_valuation"
            stats["non_residential_skipped"] += 1
            update_deal(deal_id, payload)
            print(f"Deal {deal_id}: NON-RESIDENTIAL (land/commercial) -- market_value cleared, needs manual valuation")
            continue

        if not district:
            stats["no_match"] += 1
            update_deal(deal_id, payload)
            continue

        type_avgs = flat_avgs if prop_type == "flat" else house_avgs
        new_flag = None

        if district in type_avgs and type_avgs[district][1] >= MIN_SAMPLE_SIZE:
            market_value, sample = type_avgs[district]
            stats["flat_matched" if prop_type == "flat" else "house_matched"] += 1
            payload["market_value_source"] = "land_registry_comp"
            if can_touch_flag:
                new_flag = None  # clean, confident match
        elif district in blended_avgs:
            market_value, sample = blended_avgs[district]
            stats["blended_fallback"] += 1
            payload["market_value_source"] = "blended_district_fallback"
            if can_touch_flag:
                new_flag = "low_sample_size_type_specific_fallback_used"
        else:
            stats["no_match"] += 1
            payload["market_value_source"] = "no_match"
            update_deal(deal_id, payload)
            print(f"Deal {deal_id}: no comps at all for district {district}")
            continue

        payload["market_value"] = round(market_value, 2)
        if can_touch_flag:
            payload["data_quality_flag"] = new_flag

        update_deal(deal_id, payload)
        print(f"Deal {deal_id}: type={prop_type}, district={district}, market_value={round(market_value,2)}, sample={sample}, flag={new_flag}, source={payload['market_value_source']}")

    print("\nDone.")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"  update_errors: {ERRORS}")
    if ERRORS:
        sys.exit(1)

if __name__ == "__main__":
    main()