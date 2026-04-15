// Supabase client setup
import { CONFIG } from '../app/config.js';

// Import Supabase from CDN
const { createClient } = supabase;

export const supabaseClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
