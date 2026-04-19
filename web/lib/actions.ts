'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Feedback } from '@/lib/types'

export async function updateMatchFeedback(jobId: string, feedback: Feedback | null) {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: 'Not authenticated' }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser) return { error: 'User not found' }

  const { error } = await supabase
    .from('user_job_matches')
    .update({ user_feedback: feedback })
    .eq('user_id', dbUser.id)
    .eq('job_id', jobId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
