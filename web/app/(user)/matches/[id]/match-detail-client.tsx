'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMatchFeedback } from '@/lib/actions'
import type { Feedback, PendingMatch } from '@/lib/types'

type FullMatch = PendingMatch & {
  jobs: PendingMatch['jobs'] & {
    description: string | null
    application_deadline: string | null
  }
}

export function MatchDetailClient({ match }: { match: FullMatch }) {
  const [feedback, setFeedback] = useState<Feedback | null>(match.user_feedback ?? null)
  const [descExpanded, setDescExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const job = match.jobs
  const isIdeal = match.verdict === 'ideal'
  const accentColor = isIdeal ? 'var(--pink-500)' : 'var(--teal-500)'

  function handleFeedback(type: Feedback) {
    const next = feedback === type ? null : type
    setFeedback(next)
    startTransition(async () => {
      await updateMatchFeedback(match.job_id, next)
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--stone-50)',
      padding: '32px 16px 80px',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '14px', fontWeight: 500, color: 'var(--ink-500)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 0 24px', marginLeft: '-2px',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink-900)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-500)' }}
        >
          ← Back
        </button>

        {/* Main card */}
        <article
          style={{
            background: 'white',
            border: '1px solid var(--stone-200)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            opacity: isPending ? 0.85 : 1,
            transition: 'opacity 150ms ease',
          }}
        >
          {/* Accent bar */}
          <div style={{ height: '4px', background: accentColor }} />

          <div style={{ padding: '28px 32px 32px' }}>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: '16px',
              marginBottom: '10px',
            }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(22px, 3vw, 28px)',
                fontWeight: 800, lineHeight: 1.2,
                color: 'var(--ink-900)', letterSpacing: '-0.02em',
                margin: 0,
              }}>
                {job.title}
              </h1>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  padding: '4px 12px', borderRadius: '999px',
                  background: isIdeal ? 'var(--pink-500)' : 'var(--teal-50)',
                  color: isIdeal ? 'white' : 'var(--teal-700)',
                }}>
                  {isIdeal ? 'Strong match' : 'Worth a look'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--stone-400)', fontFamily: 'var(--font-mono)' }}>
                  {Math.round(match.score * 100)}% score
                </span>
              </div>
            </div>

            {/* Meta row */}
            <div style={{
              fontSize: '14px', color: 'var(--stone-500)',
              display: 'flex', alignItems: 'center', gap: '6px',
              flexWrap: 'wrap', marginBottom: '20px',
            }}>
              {job.company && <span style={{ fontWeight: 500, color: 'var(--ink-600)' }}>{job.company}</span>}
              {job.company && job.location_text && <Dot />}
              {job.location_text && <span>{job.location_text}</span>}
              {job.posted_at && <><Dot /><span>{formatPostedAt(job.posted_at)}</span></>}
              {job.application_deadline && (
                <><Dot /><span style={{ color: 'var(--pink-600)', fontWeight: 500 }}>
                  Apply by {formatDate(job.application_deadline)}
                </span></>
              )}
            </div>

            {/* Summary */}
            {match.one_line_summary && (
              <p style={{
                fontSize: '16px', lineHeight: 1.65,
                color: 'var(--ink-700)', marginBottom: '24px',
                padding: '14px 18px',
                background: 'var(--stone-50)',
                borderRadius: '12px',
                borderLeft: `3px solid ${accentColor}`,
              }}>
                {match.one_line_summary}
              </p>
            )}

            {/* Why this matched */}
            {match.matched_criteria.length > 0 && (
              <Section title="Why this matched">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {match.matched_criteria.map((c, i) => (
                    <span key={i} style={{
                      fontSize: '13px', fontWeight: 500,
                      padding: '5px 13px', borderRadius: '999px',
                      background: 'var(--success-light)', color: 'var(--success-dark)',
                    }}>
                      ✓ {c}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Concerns */}
            {match.concerns.length > 0 && (
              <Section title="Worth knowing">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {match.concerns.map((c, i) => (
                    <span key={i} style={{
                      fontSize: '13px', fontWeight: 500,
                      padding: '5px 13px', borderRadius: '999px',
                      background: 'var(--yellow-100)', color: 'var(--ink-600)',
                    }}>
                      · {c}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Full posting */}
            {job.description && (
              <Section title="Full posting">
                <div>
                  <div style={{
                    fontSize: '14px', lineHeight: 1.75, color: 'var(--ink-600)',
                    maxHeight: descExpanded ? 'none' : '160px',
                    overflow: 'hidden',
                    maskImage: descExpanded ? 'none' : 'linear-gradient(to bottom, black 60%, transparent 100%)',
                    WebkitMaskImage: descExpanded ? 'none' : 'linear-gradient(to bottom, black 60%, transparent 100%)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {job.description}
                  </div>
                  <button
                    onClick={() => setDescExpanded(v => !v)}
                    style={{
                      marginTop: '10px',
                      fontSize: '13px', fontWeight: 600,
                      color: 'var(--pink-500)', background: 'none',
                      border: 'none', cursor: 'pointer', padding: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
                  >
                    {descExpanded ? 'Show less ↑' : 'Show full posting ↓'}
                  </button>
                </div>
              </Section>
            )}

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--stone-100)', margin: '24px -32px' }} />

            {/* Actions */}
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: '10px', flexWrap: 'wrap',
            }}>
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
                  marginLeft: 'auto',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '10px 20px', borderRadius: '999px',
                  background: 'var(--pink-500)', color: 'white',
                  fontSize: '14px', fontWeight: 700,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px oklch(64% 0.14 345 / 0.28)',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--pink-600)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--pink-500)' }}
              >
                View original posting →
              </a>
            </div>

          </div>
        </article>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '13px', fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        color: 'var(--stone-400)', marginBottom: '12px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Dot() {
  return (
    <span style={{
      width: '3px', height: '3px', borderRadius: '50%',
      background: 'var(--stone-400)', display: 'inline-block', flexShrink: 0,
    }} />
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
    padding: '10px 18px', borderRadius: '999px',
    fontFamily: 'var(--font-body)',
    fontSize: '14px', fontWeight: 600,
    border: '1.5px solid var(--stone-200)',
    background: 'white', color: 'var(--ink-600)',
    cursor: 'pointer', transition: 'all 140ms ease',
    whiteSpace: 'nowrap',
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
