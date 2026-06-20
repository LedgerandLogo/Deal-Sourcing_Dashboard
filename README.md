# Deal sourcing dashboard

Pipeline tracker for below-market-value property sourcing: deal stages, BMV% calculation, cash buyer matching, sourcing fee projections. Backed by Supabase with per-user login.

## Setup

### 1. Supabase

1. Already created your project. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the contents of `supabase_schema.sql` and run it. This creates the `deals` and `buyers` tables with row-level security, so each user only sees their own data.
3. In **Authentication → Providers**, confirm **Email** is enabled (it is by default).
4. Optional: in **Authentication → Settings**, you can turn off "Confirm email" while testing, so new sign-ups don't need to click an email link.

### 2. Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your Supabase URL and publishable key (already done for you in this build).

### 3. Deploy to Vercel

1. Push this repo to GitHub (see below).
2. In Vercel: **New Project → Import** your GitHub repo.
3. In the Vercel project's **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   (same values as your `.env` file)
4. Deploy. Vercel auto-detects Vite.

### 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial deal sourcing dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/deal-sourcing-dashboard.git
git push -u origin main
```

## Notes

- The `.env` file is gitignored — your keys won't be committed. Set the same values in Vercel's dashboard separately.
- The publishable key is safe to expose in frontend code. Never use the `service_role`/`secret` key here.
- Row-level security means each signed-in user only ever sees their own deals and buyers.
