// useTier — single source of truth for "is this user Pro?" across the app.
// Guests and unsynced/free profiles are 'free' by default, so the core
// app stays fully usable without ever touching Clerk/Supabase.
import useAppStore from './useAppStore'

export default function useTier() {
  const tier = useAppStore((s) => s.activeProfile?.tier || 'free')
  return { tier, isPro: tier === 'pro' }
}
