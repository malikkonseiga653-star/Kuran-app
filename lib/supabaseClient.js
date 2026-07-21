import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kflcutauonhevaaufavh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_r9iWsqVHP2cMMNP3Frgeyw_OzWaUytN";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
