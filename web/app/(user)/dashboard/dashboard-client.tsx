'use client'

import { useState } from 'react'
import { MatchCard } from '@/components/match-card'
import type { PendingMatch, RecentMatch, Feedback } from '@/lib/types'

type Props = {
  firstName: string
  pendingMatches: PendingMatch[]
  recentMatches: RecentMatch[]
  nextSearch: { day: string | null; hour: number | null } | null
}

export function DashboardClient({ firstName, pendingMatches, recentMatches, nextSearch }: Props) {
  const [recentOpen, setRecentOpen] = useState(false)

  const ideal = pendingMatches.filter(m => m.verdict === 'ideal')
  const worth = pendingMatches.filter(m => m.verdict === 'worth_a_look')
  const hasAnyMatches = pendingMatches.length > 0 || recentMatches.length > 0

  // State: first-visit (no matches at all), matches pending, or caught-up
  if (!hasAnyMatches) {
    return (
      <Page>
        <Greeting name={firstName} sub="Welcome — we're so glad you're here." />
        <EmptyState
          icon="🌿"
          iconBg="var(--teal-50)"
          title="We're searching for you."
          body="We've kicked off your first search. Your matches should arrive within a day or two — we'll email you when they're ready. In the meantime, feel free to update your preferences in Settings."
        />
        <FooterNote nextSearch={nextSearch} />
      </Page>
    )
  }

  if (pendingMatches.length === 0) {
    return (
      <Page>
        <Greeting name={firstName} sub="You're all up to date." />
        <EmptyState
          icon="✓"
          iconBg="var(--success-light)"
          title="You're all caught up!"
          body="You've reviewed everything. We'll email you when new matches come in."
        />
        {recentMatches.length > 0 && (
          <MatchSection style={{ marginTop: '32px' }}>
            <SectionHeader title="Recently reviewed" count={recentMatches.length} />
            {recentMatches.map((r, i) => (
              <RecentCard key={r.job_id} rank={i + 1} match={r} />
            ))}
          </MatchSection>
        )}
        <FooterNote nextSearch={nextSearch} />
      </Page>
    )
  }

  const greetingSub =
    pendingMatches.length === 1
      ? 'We found one match worth your attention this week.'
      : `We found ${pendingMatches.length} matches worth your attention this week.`

  return (
    <Page>
      <Greeting name={firstName} sub={greetingSub} />

      {ideal.length > 0 && (
        <MatchSection>
          <SectionHeader title="Strong matches" count={ideal.length} titleColor="var(--pink-700)" />
          {ideal.map(m => <MatchCard key={m.job_id} match={m} />)}
        </MatchSection>
      )}

      {worth.length > 0 && (
        <MatchSection>
          <SectionHeader title="Worth a look" count={worth.length} titleColor="var(--teal-700)" />
          {worth.map(m => <MatchCard key={m.job_id} match={m} />)}
        </MatchSection>
      )}

      {recentMatches.length > 0 && (
        <MatchSection>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '14px', color: 'var(--ink-500)',
              padding: '10px 0', marginBottom: '12px',
              transition: 'color 120ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink-900)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-500)' }}
            onClick={() => setRecentOpen(o => !o)}
          >
            <ChevronIcon rotated={recentOpen} />
            {recentOpen ? 'Hide' : 'Show'} older matches ({recentMatches.length})
          </button>
          {recentOpen && recentMatches.map((r, i) => (
            <RecentCard key={r.job_id} rank={i + 1} match={r} />
          ))}
        </MatchSection>
      )}

      <FooterNote nextSearch={nextSearch} />
    </Page>
  )
}

/* ── Layout pieces ── */

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>
      {children}
    </main>
  )
}

function Greeting({ name, sub }: { name: string; sub: string }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(32px, 5vw, 44px)',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        color: 'var(--ink-900)',
      }}>
        Hi <em style={{ fontStyle: 'normal', color: 'var(--pink-500)' }}>{name}.</em>
      </div>
      <p style={{ marginTop: '8px', fontSize: '16px', lineHeight: 1.6, color: 'var(--ink-500)' }}>
        {sub}
      </p>
    </div>
  )
}

function MatchSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ marginBottom: '40px', ...style }}>{children}</div>
}

function SectionHeader({
  title, count, titleColor,
}: { title: string; count: number; titleColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '13px', fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        color: titleColor ?? 'var(--ink-500)',
      }}>
        {title}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'var(--stone-200)' }} />
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px', color: 'var(--stone-500)',
        background: 'var(--stone-200)',
        padding: '2px 8px', borderRadius: '999px',
      }}>
        {count}
      </span>
    </div>
  )
}

function EmptyState({
  icon, iconBg, title, body,
}: { icon: string; iconBg: string; title: string; body: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '56px 24px',
      background: 'white', borderRadius: '20px',
      border: '1px solid var(--stone-200)',
    }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px', fontSize: '24px',
        background: iconBg,
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '22px', fontWeight: 700,
        color: 'var(--ink-900)', marginBottom: '8px',
        letterSpacing: '-0.02em',
      }}>
        {title}
      </div>
      <p style={{ fontSize: '15px', color: 'var(--ink-500)', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>
        {body}
      </p>
    </div>
  )
}

function RecentCard({ rank, match }: { rank: number; match: RecentMatch }) {
  const fb = match.user_feedback
  return (
    <div style={{
      background: 'white', border: '1px solid var(--stone-200)',
      borderRadius: '12px', padding: '14px 18px',
      marginBottom: '8px', opacity: 0.75,
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        color: 'var(--stone-500)', flexShrink: 0, width: '20px',
      }}>
        {rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 600, color: 'var(--ink-800)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {match.jobs.title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--stone-500)', marginTop: '1px' }}>
          {match.jobs.company}
        </div>
      </div>
      {fb && <FeedbackBadge feedback={fb} />}
    </div>
  )
}

function FeedbackBadge({ feedback }: { feedback: Feedback }) {
  const styles: Record<Feedback, React.CSSProperties> = {
    good_match: { background: 'var(--success-light)', color: 'var(--success-dark)' },
    bad_match:  { background: 'var(--pink-50)',       color: 'var(--pink-700)' },
    applied:    { background: 'var(--teal-50)',        color: 'var(--teal-700)' },
  }
  const labels: Record<Feedback, string> = {
    good_match: 'Good match',
    bad_match:  'Not for me',
    applied:    'Applied',
  }
  return (
    <span style={{
      fontSize: '12px', fontWeight: 600,
      padding: '3px 9px', borderRadius: '999px', flexShrink: 0,
      ...styles[feedback],
    }}>
      {labels[feedback]}
    </span>
  )
}

function FooterNote({ nextSearch }: { nextSearch: { day: string | null; hour: number | null } | null }) {
  const label = nextSearch?.day && nextSearch?.hour !== null
    ? `Next search: ${formatDay(nextSearch.day)} at ${formatHour(nextSearch.hour!)}`
    : null

  if (!label) return null

  return (
    <div style={{
      marginTop: '48px', textAlign: 'center',
      fontSize: '13px', color: 'var(--stone-500)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    }}>
      <ClockIcon />
      {label}
    </div>
  )
}

function ChevronIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      style={{ transition: 'transform 200ms ease', transform: rotated ? 'rotate(180deg)' : 'none' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function formatDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

function formatHour(hour: number): string {
  const h = hour % 12 || 12
  return `${h} ${hour < 12 ? 'am' : 'pm'}`
}
