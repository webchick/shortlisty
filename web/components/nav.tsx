'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'oklch(98.5% 0.01 80 / 0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid oklch(91% 0.02 80)',
      padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '56px',
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        textDecoration: 'none',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ display: 'block', width: '20px', height: '3px', borderRadius: '2px', background: 'var(--pink-500)' }} />
          <span style={{ display: 'block', width: '14px', height: '3px', borderRadius: '2px', background: 'var(--teal-500)' }} />
          <span style={{ display: 'block', width: '17px', height: '3px', borderRadius: '2px', background: 'var(--yellow-400)' }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '17px', fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--ink-900)',
        }}>
          Shortlisty
          <em style={{ fontStyle: 'normal', color: 'var(--pink-500)', fontWeight: 400, fontSize: '13px' }}>.ai</em>
        </span>
      </Link>

      {/* Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <NavLink href="/dashboard" active={pathname === '/dashboard'}>Dashboard</NavLink>
        <NavLink href="/settings" active={pathname.startsWith('/settings')}>Settings</NavLink>
        <button
          onClick={handleSignOut}
          style={{
            padding: '6px 12px', borderRadius: '8px',
            fontSize: '14px', color: 'var(--stone-500)',
            cursor: 'pointer', border: 'none', background: 'none',
            fontFamily: 'var(--font-body)',
            transition: 'all 120ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--stone-200)'
            e.currentTarget.style.color = 'var(--ink-900)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = 'var(--stone-500)'
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: '6px 12px', borderRadius: '8px',
        fontSize: '14px',
        color: active ? 'var(--pink-500)' : 'var(--ink-500)',
        fontWeight: active ? 600 : 400,
        textDecoration: 'none',
        transition: 'all 120ms ease',
        background: 'none',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'var(--stone-200)'
          e.currentTarget.style.color = 'var(--ink-900)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'none'
          e.currentTarget.style.color = 'var(--ink-500)'
        }
      }}
    >
      {children}
    </Link>
  )
}
