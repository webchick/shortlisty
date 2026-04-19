'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type OnboardingData = {
  profile: string
  city: string
  state: string
  country: string
  radius: number
  remote: boolean
  ideal: string[]
  acceptable: string[]
  heckNo: string[]
  schedule: 'weekly' | 'daily' | 'manual'
  day: string
  hour: number
}

export async function saveOnboarding(data: OnboardingData) {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser) redirect('/login')

  await supabase
    .from('users')
    .update({
      profile_summary: data.profile.trim(),
      location: {
        city: data.city.trim(),
        state: data.state.trim(),
        country: data.country.trim(),
        radius_miles: data.radius,
        remote_ok: data.remote,
      },
    })
    .eq('id', dbUser.id)

  await supabase
    .from('user_categories')
    .upsert(
      {
        user_id: dbUser.id,
        category: 'jobs',
        criteria: {
          ideal: data.ideal,
          acceptable: data.acceptable,
          heck_no: data.heckNo,
        },
        notification_schedule: data.schedule,
        notification_day: data.day.toLowerCase(),
        notification_hour: data.hour,
        active: true,
      },
      { onConflict: 'user_id,category' },
    )

  redirect('/dashboard')
}
