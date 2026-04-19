import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MatchDetailClient } from './match-detail-client'

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser) redirect('/login')

  const { data: match } = await supabase
    .from('user_job_matches')
    .select(`
      user_id, job_id, score, verdict,
      one_line_summary, matched_criteria, concerns,
      scored_at, user_feedback,
      jobs (
        id, title, company, location_text, url,
        posted_at, description, application_deadline
      )
    `)
    .eq('user_id', dbUser.id)
    .eq('job_id', id)
    .single()

  if (!match) notFound()

  return <MatchDetailClient match={match as any} />
}
