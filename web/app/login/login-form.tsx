'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'var(--success-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', margin: '0 auto 20px',
        }}>
          ✓
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px', fontWeight: 800,
          letterSpacing: '-0.03em', color: 'var(--ink-900)',
          marginBottom: '12px',
        }}>
          Check your email.
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.65, color: 'var(--ink-500)' }}>
          We sent a link to <strong style={{ color: 'var(--ink-900)' }}>{email}</strong>.
          {' '}It&rsquo;ll expire in 10 minutes.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ width: '100%', maxWidth: '400px' }}
    >
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800,
        letterSpacing: '-0.03em', color: 'var(--ink-900)',
        marginBottom: '10px',
      }}>
        Welcome back.
      </h1>
      <p style={{
        fontSize: '16px', lineHeight: 1.65,
        color: 'var(--ink-500)', marginBottom: '32px',
      }}>
        Enter your email and we&rsquo;ll send you a link to sign in.
      </p>

      <label style={{
        display: 'block', fontSize: '13px', fontWeight: 600,
        color: 'var(--ink-600)', marginBottom: '6px',
      }}>
        Email address
      </label>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoFocus
        style={{
          width: '100%', padding: '13px 16px',
          border: '1.5px solid var(--stone-300)',
          borderRadius: '12px', background: 'white',
          fontFamily: 'var(--font-body)',
          fontSize: '16px', color: 'var(--ink-900)',
          outline: 'none', marginBottom: '16px',
          boxShadow: '0 1px 3px oklch(16% 0.04 60 / 0.05)',
          transition: 'border 150ms ease, box-shadow 150ms ease',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--pink-500)'
          e.target.style.boxShadow = '0 0 0 3px oklch(64% 0.14 345 / 0.12)'
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--stone-300)'
          e.target.style.boxShadow = '0 1px 3px oklch(16% 0.04 60 / 0.05)'
        }}
      />

      <button
        type="submit"
        disabled={loading || !email.trim()}
        style={{
          width: '100%', padding: '13px 24px',
          background: loading ? 'var(--pink-300)' : 'var(--pink-500)',
          color: 'white', border: 'none', borderRadius: '999px',
          fontFamily: 'var(--font-body)',
          fontSize: '16px', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 16px oklch(64% 0.14 345 / 0.28)',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => {
          if (!loading) e.currentTarget.style.background = 'var(--pink-600)'
        }}
        onMouseLeave={e => {
          if (!loading) e.currentTarget.style.background = 'var(--pink-500)'
        }}
      >
        {loading ? 'Sending…' : 'Send me a link'}
      </button>
    </form>
  )
}
