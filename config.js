import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace these with your Supabase project credentials
export const SUPABASE_URL = "https://tervkeyytdpqrxwejmli.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcnZrZXl5dGRwcXJ4d2VqbWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NzA5OTcsImV4cCI6MjA3NjI0Njk5N30.DU-7FdWu9rPTr5Hcj_vSY7WHk0-DvivmETg1-MWLZi0";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Replace with your Gemini API key
export const GEMINI_API_KEY = "AIzaSyBuhjoSxSw3cjyGMNmrPFoMnd-ZtDKcPHk";
export const GEMINI_MODEL = "gemini-2.0-flash"; // Example model
