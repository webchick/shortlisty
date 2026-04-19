import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './dashboard-client'
import type { PendingMatch, RecentMatch } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser) redirect('/login')

  const [matchesResult, recentResult, categoryResult] = await Promise.all([
    supabase
      .from('user_job_matches')
      .select('*, jobs(id, title, company, location_text, url, posted_at)')
      .eq('user_id', dbUser.id)
      .is('user_feedback', null)
      .neq('verdict', 'skip')
      .order('score', { ascending: false })
      .limit(20),

    supabase
      .from('user_job_matches')
      .select('job_id, score, verdict, user_feedback, scored_at, jobs(title, company)')
      .eq('user_id', dbUser.id)
      .not('user_feedback', 'is', null)
      .order('scored_at', { ascending: false })
      .limit(10),

    supabase
      .from('user_categories')
      .select('category, notification_schedule, notification_day, notification_hour')
      .eq('user_id', dbUser.id)
      .eq('active', true)
      .limit(1)
      .single(),
  ])

  const firstName = dbUser.name.split(' ')[0]
  const uc = categoryResult.data

  return (
    <DashboardClient
      firstName={firstName}
      pendingMatches={(matchesResult.data ?? []) as PendingMatch[]}
      recentMatches={(recentResult.data ?? []) as RecentMatch[]}
      nextSearch={
        uc ? { day: uc.notification_day, hour: uc.notification_hour } : null
      }
    />
  )
}
