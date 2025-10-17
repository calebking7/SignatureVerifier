import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase Configuration
export const SUPABASE_URL = "https://yourproject.supabase.co";
export const SUPABASE_KEY = "your-anon-key";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Gemini Configuration
export const GEMINI_API_KEY = "your-gemini-api-key";
export const GEMINI_MODEL = "gemini-2.0-flash";


// Supabase Configuration
export const SUPABASE_URL = env.SUPABASE_URL || '';
export const SUPABASE_KEY = env.SUPABASE_KEY || '';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Gemini Configuration
export const GEMINI_API_KEY = env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-2.0-flash';

