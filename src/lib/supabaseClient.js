// Supabase client — used for tier/subscription data only.
// Identity comes from Clerk, not Supabase Auth; clerk_user_id is a plain
// foreign key. This client uses the public anon key and must never be
// given write access to the profiles table (writes happen server-side,
// via the Stripe webhook, using the service role key).
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
