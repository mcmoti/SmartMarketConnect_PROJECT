// Check for any remaining Supabase references
const supabaseImports = [
  "from '@/integrations/supabase/client'",
  "from '@supabase/supabase-js'",
  "supabase.from(",
  "supabase.auth.",
  "@supabase/supabase-js"
];

// Search in all source files
