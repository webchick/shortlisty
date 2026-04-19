import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser) {
        // Link auth.users → public.users if not already linked
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, profile_summary, auth_user_id')
          .eq('email', authUser.email!)
          .single()

        if (!dbUser) {
          // Email not in the system — holding page
          return NextResponse.redirect(`${origin}/not-on-the-list`)
        }

        if (!dbUser.auth_user_id) {
          await supabase
            .from('users')
            .update({ auth_user_id: authUser.id })
            .eq('id', dbUser.id)
        }

        // First-time user: no profile yet → onboarding
        if (!dbUser.profile_summary) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }

        return NextResponse.redirect(`${origin}/dashboard`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
