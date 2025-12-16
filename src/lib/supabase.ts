import { createClient } from '@supabase/supabase-js';

// For POC purposes, hardcoding keys here since .env write is restricted in this environment.
// In production, move these to environment variables.
const supabaseUrl = 'https://qzrmtljqhvqsukrtlxrm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6cm10bGpxaHZxc3VrcnRseHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjU2MDgsImV4cCI6MjA3OTk0MTYwOH0.rvZKPjfwt4q4mOJoBxgfz9Nf_xTrsPhT8YalpRhlQIk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
