import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Load environment variables from .env file
async function loadEnvVariables() {
    try {
        const response = await fetch('/.env');
        const text = await response.text();
        const vars = {};
        text.split('\n').forEach(line => {
            const [key, ...value] = line.split('=');
            if (key && !key.startsWith('#')) {
                vars[key.trim()] = value.join('=').trim();
            }
        });
        return vars;
    } catch (error) {
        console.error('Failed to load .env file:', error);
        return {};
    }
}

// Initialize environment variables
const env = await loadEnvVariables();

// Supabase Configuration
export const SUPABASE_URL = env.SUPABASE_URL || '';
export const SUPABASE_KEY = env.SUPABASE_KEY || '';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Gemini Configuration
export const GEMINI_API_KEY = env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-2.0-flash';
