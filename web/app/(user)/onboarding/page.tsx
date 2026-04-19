import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingClient } from './onboarding-client'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // If already onboarded, go to dashboard
  const { data: dbUser } = await supabase
    .from('users')
    .select('profile_summary')
    .eq('auth_user_id', authUser.id)
    .single()

  if (dbUser?.profile_summary) redirect('/dashboard')

  return <OnboardingClient />
}
