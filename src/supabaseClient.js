import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zeoqkkqseuoebdcwkoki.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inplb3Fra3FzZXVvZWJkY3drb2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzI3MjEsImV4cCI6MjA5NzU0ODcyMX0.4011AFx69vNrfoyCSHmKcjmCxeskp9XkRwdk9bWDHks';

export const supabase = createClient(supabaseUrl, supabaseKey);
