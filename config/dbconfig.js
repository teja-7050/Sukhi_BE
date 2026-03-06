const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_API_URL,
  process.env.SUPABASE_ANON_KEY,
);

module.exports = supabase;
