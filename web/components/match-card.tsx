'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMatchFeedback } from '@/lib/actions'
import type { Feedback, PendingMatch } from '@/lib/types'

type Props = {
  match: PendingMatch
  initialFeedback?: Feedback | null
}

export function MatchCard({ match, initialFeedback }: Props) {
  const [feedback, setFeedback] = useState<Feedback | null>(initialFeedback ?? null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const isIdeal = match.verdict === 'ideal'
  const accentColor = isIdeal ? 'var(--pink-500)' : 'var(--teal-500)'
  const job = match.jobs

  function handleFeedback(type: Feedback) {
    const next = feedback === type ? null : type
    setFeedback(next)
    startTransition(async () => {
      await updateMatchFeedback(match.job_id, next)
    })
  }

  return (
    <article
      style={{
        background: 'white',
        border: '1px solid var(--stone-200)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '12px',
        overflow: 'hidden',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        cursor: 'pointer',
        opacity: isPending ? 0.8 : 1,
      }}
      onClick={() => router.push(`/matches/${match.job_id}`)}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Accent bar */}
      <div style={{ height: '3px', background: accentColor }} />

      {/* Card body */}
      <div style={{ padding: '20px 22px 16px' }}>
        {/* Title + badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '19px', fontWeight: 700,
            lineHeight: 1.25, color: 'var(--ink-900)',
            letterSpacing: '-0.01em',
          }}>
            {job.title}
          </div>
          <span style={{
            flexShrink: 0, marginTop: '3px',
            fontSize: '11px', fontWeight: 600,
            padding: '3px 9px', borderRadius: '999px',
            whiteSpace: 'nowrap',
            background: isIdeal ? 'var(--pink-500)' : 'var(--teal-50)',
            color: isIdeal ? 'white' : 'var(--teal-700)',
          }}>
            {isIdeal ? 'Strong match' : 'Worth a look'}
          </span>
        </div>

        {/* Meta */}
        <div style={{
          fontSize: '13px', color: 'var(--stone-500)',
          marginBottom: '10px',
          display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' as const,
        }}>
          {job.company && <span>{job.company}</span>}
          {job.company && job.location_text && <Dot />}
          {job.location_text && <span>{job.location_text}</span>}
          {job.posted_at && <><Dot /><span>{formatPostedAt(job.posted_at)}</span></>}
        </div>

        {/* Summary */}
        {match.one_line_summary && (
          <p style={{
            fontSize: '15px', lineHeight: 1.6,
            color: 'var(--ink-700)',
            marginBottom: '14px',
          }}>
            {match.one_line_summary}
          </p>
        )}

        {/* Matched criteria pills */}
        {match.matched_criteria.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '8px' }}>
            {match.matched_criteria.map((c, i) => (
              <span key={i} style={{
                fontSize: '12px', fontWeight: 500,
                padding: '3px 10px', borderRadius: '999px',
                background: 'var(--success-light)', color: 'var(--success-dark)',
              }}>
                ✓ {c}
              </span>
            ))}
          </div>
        )}

        {/* Concerns pills */}
        {match.concerns.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '10px' }}>
            {match.concerns.map((c, i) => (
              <span key={i} style={{
                fontSize: '12px', fontWeight: 500,
                padding: '3px 10px', borderRadius: '999px',
                background: 'var(--yellow-100)', color: 'var(--ink-600)',
              }}>
                · {c}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--stone-100)', margin: '0 -22px 16px' }} />

        {/* Actions */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}
          onClick={e => e.stopPropagation()}
        >
          <FeedbackBtn
            type="good_match"
            active={feedback === 'good_match'}
            onClick={() => handleFeedback('good_match')}
            label="Good match"
            emoji="👍"
            activeStyle={{ background: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success-dark)' }}
            hoverStyle={{ background: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success-dark)' }}
          />
          <FeedbackBtn
            type="bad_match"
            active={feedback === 'bad_match'}
            onClick={() => handleFeedback('bad_match')}
            label="Not for me"
            emoji="👎"
            activeStyle={{ background: 'var(--pink-50)', borderColor: 'var(--pink-500)', color: 'var(--pink-700)' }}
            hoverStyle={{ background: 'var(--pink-50)', borderColor: 'var(--pink-500)', color: 'var(--pink-700)' }}
          />
          <FeedbackBtn
            type="applied"
            active={feedback === 'applied'}
            onClick={() => handleFeedback('applied')}
            label="I applied"
            emoji="🎯"
            activeStyle={{ background: 'var(--teal-50)', borderColor: 'var(--teal-500)', color: 'var(--teal-700)' }}
            hoverStyle={{ background: 'var(--teal-50)', borderColor: 'var(--teal-500)', color: 'var(--teal-700)' }}
          />
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: 'auto', fontSize: '13px',
              color: 'var(--pink-500)', textDecoration: 'none',
              fontWeight: 500, whiteSpace: 'nowrap' as const,
              display: 'inline-flex', alignItems: 'center', gap: '3px',
            }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
          >
            View posting →
          </a>
        </div>
      </div>
    </article>
  )
}

function Dot() {
  return (
    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--stone-400)', display: 'inline-block', flexShrink: 0 }} />
  )
}

type FeedbackBtnProps = {
  type: Feedback
  active: boolean
  onClick: () => void
  label: string
  emoji: string
  activeStyle: React.CSSProperties
  hoverStyle: React.CSSProperties
}

function FeedbackBtn({ active, onClick, label, emoji, activeStyle, hoverStyle }: FeedbackBtnProps) {
  const [hovered, setHovered] = useState(false)
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', borderRadius: '999px',
    fontFamily: 'var(--font-body)',
    fontSize: '13px', fontWeight: 600,
    border: '1.5px solid var(--stone-200)',
    background: 'white', color: 'var(--ink-600)',
    cursor: 'pointer', transition: 'all 140ms ease',
    whiteSpace: 'nowrap' as const,
  }
  const style = active ? { ...base, ...activeStyle } : hovered ? { ...base, ...hoverStyle } : base

  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {active ? '✓' : emoji} {label}
    </button>
  )
}

function formatPostedAt(postedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(postedAt).getTime()) / 86_400_000)
  if (diff === 0) return 'Posted today'
  if (diff === 1) return 'Posted yesterday'
  if (diff < 7) return `Posted ${diff} days ago`
  if (diff < 14) return 'Posted 1 week ago'
  return `Posted ${Math.floor(diff / 7)} weeks ago`
}
