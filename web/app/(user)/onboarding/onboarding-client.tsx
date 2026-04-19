'use client'

import { useState, useTransition, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { saveOnboarding, type OnboardingData } from './actions'

const TOTAL_STEPS = 7

type Draft = {
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

const INITIAL: Draft = {
  profile: '', city: '', state: '', country: 'United States',
  radius: 25, remote: false,
  ideal: [], acceptable: [], heckNo: [],
  schedule: 'weekly', day: 'Sunday', hour: 18,
}

export function OnboardingClient() {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<Draft>(INITIAL)
  const [saving, startSave] = useTransition()
  const router = useRouter()

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function next() { setStep(s => Math.min(TOTAL_STEPS, s + 1)) }
  function back() { setStep(s => Math.max(1, s - 1)) }

  function handleFinish() {
    startSave(async () => {
      const data: OnboardingData = {
        profile: draft.profile, city: draft.city, state: draft.state,
        country: draft.country, radius: draft.radius, remote: draft.remote,
        ideal: draft.ideal, acceptable: draft.acceptable, heckNo: draft.heckNo,
        schedule: draft.schedule, day: draft.day, hour: draft.hour,
      }
      await saveOnboarding(data)
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--stone-50)' }}>
      {/* Wordmark */}
      <a href="/" style={{
        position: 'fixed', top: '20px', left: '24px',
        display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', zIndex: 10,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5px' }}>
          <span style={{ display: 'block', width: '18px', height: '3px', borderRadius: '2px', background: 'var(--pink-500)' }} />
          <span style={{ display: 'block', width: '13px', height: '3px', borderRadius: '2px', background: 'var(--teal-500)' }} />
          <span style={{ display: 'block', width: '16px', height: '3px', borderRadius: '2px', background: 'var(--yellow-400)' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink-900)' }}>
          Shortlisty<em style={{ fontStyle: 'normal', color: 'var(--pink-500)', fontWeight: 400, fontSize: '13px' }}>.ai</em>
        </span>
      </a>

      {/* Step content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 100px',
      }}>
        <div style={{ width: '100%', maxWidth: '560px' }} key={step}>
          {step === 1 && (
            <Step1 value={draft.profile} onChange={v => set('profile', v)} onNext={next} />
          )}
          {step === 2 && (
            <Step2 draft={draft} set={set} onNext={next} onBack={back} />
          )}
          {step === 3 && (
            <StepChips
              question={<>What would<br />be <Em>ideal?</Em></>}
              hint="What would make a role perfect? Think schedule, setting, type of work, culture. Press Enter after each one."
              items={draft.ideal}
              onChange={v => set('ideal', v)}
              placeholder="e.g. 1:1 patient care, small agency, part-time…"
              chipStyle={{ background: 'var(--success-light)', color: 'var(--success-dark)' }}
              onNext={next} onBack={back}
            />
          )}
          {step === 4 && (
            <StepChips
              question={<>What&rsquo;s fine but<br />not <Em>exciting?</Em></>}
              hint="Things you could live with, even if they're not your first choice."
              items={draft.acceptable}
              onChange={v => set('acceptable', v)}
              placeholder="e.g. some admin duties, mild commute, medium-sized org…"
              chipStyle={{ background: 'var(--yellow-100)', color: 'var(--ink-600)' }}
              onNext={next} onBack={back}
            />
          )}
          {step === 5 && (
            <StepChips
              question={<>What&rsquo;s a<br />hard <Em>no?</Em></>}
              hint='The things that would make you close the email immediately. Be specific — "overnight shifts", "big chain facilities"…'
              items={draft.heckNo}
              onChange={v => set('heckNo', v)}
              placeholder="e.g. overnight shifts, large corporate chains, weekends…"
              chipStyle={{ background: 'var(--pink-50)', color: 'var(--pink-700)' }}
              onNext={next} onBack={back}
            />
          )}
          {step === 6 && (
            <Step6 draft={draft} set={set} onNext={next} onBack={back} />
          )}
          {step === 7 && (
            <Step7 draft={draft} onFinish={handleFinish} saving={saving} />
          )}
        </div>
      </div>

      {/* Progress dots */}
      {step < 7 && (
        <div style={{
          position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          {Array.from({ length: TOTAL_STEPS - 1 }, (_, i) => {
            const n = i + 1
            const isDone = n < step
            const isActive = n === step
            return (
              <div key={n} style={{
                height: '6px', borderRadius: '3px',
                background: (isDone || isActive) ? 'var(--pink-500)' : 'var(--stone-300)',
                opacity: isDone ? 0.4 : 1,
                width: isActive ? '20px' : '6px',
                transition: 'all 300ms cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Step components ── */

function Em({ children }: { children: React.ReactNode }) {
  return <em style={{ fontStyle: 'normal', color: 'var(--pink-500)' }}>{children}</em>
}

function Question({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800,
      lineHeight: 1.2, letterSpacing: '-0.03em',
      color: 'var(--ink-900)', marginBottom: '10px',
    }}>
      {children}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--ink-500)', marginBottom: '28px' }}>
      {children}
    </p>
  )
}

function Actions({ onBack, onNext, nextLabel = 'Continue →', isFirst = false }: {
  onBack?: () => void; onNext?: () => void; nextLabel?: string; isFirst?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28px' }}>
      <button
        onClick={onBack}
        style={{
          visibility: isFirst ? 'hidden' : 'visible',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '10px 18px', borderRadius: '999px',
          background: 'none', border: '1.5px solid var(--stone-300)',
          fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500,
          color: 'var(--ink-500)', cursor: 'pointer', transition: 'all 130ms ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--stone-200)'; e.currentTarget.style.color = 'var(--ink-900)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--ink-500)' }}
      >
        ← Back
      </button>
      <button
        onClick={onNext}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '12px 28px', borderRadius: '999px',
          background: 'var(--pink-500)', color: 'white', border: 'none',
          fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 16px oklch(64% 0.14 345 / 0.28)',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--pink-600)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--pink-500)'; e.currentTarget.style.transform = 'none' }}
      >
        {nextLabel}
      </button>
    </div>
  )
}

function Step1({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  return (
    <>
      <Question>Tell us a bit<br />about <Em>yourself.</Em></Question>
      <Hint>Don&rsquo;t worry about being polished — just tell us what kind of work you&rsquo;re looking for and what you bring to it.</Hint>
      <textarea
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g., I'm a retired nurse with 30 years of experience in home health care. I prefer small agencies over big corporate ones, and I'm looking for 1:1 patient care, ideally part-time…"
        style={{
          width: '100%', minHeight: '160px', padding: '16px 18px',
          border: '1.5px solid var(--stone-300)', borderRadius: '14px', background: 'white',
          fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.65,
          color: 'var(--ink-900)', resize: 'vertical', outline: 'none',
          boxShadow: '0 1px 3px oklch(16% 0.04 60 / 0.05)', transition: 'border 150ms ease, box-shadow 150ms ease',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--pink-500)'; e.target.style.boxShadow = '0 0 0 3px oklch(64% 0.14 345 / 0.12)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--stone-300)'; e.target.style.boxShadow = '0 1px 3px oklch(16% 0.04 60 / 0.05)' }}
      />
      <Actions isFirst onNext={onNext} />
    </>
  )
}

function Step2({ draft, set, onNext, onBack }: {
  draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void
  onNext: () => void; onBack: () => void
}) {
  return (
    <>
      <Question>Where are<br /><Em>you?</Em></Question>
      <Hint>We&rsquo;ll use this to find opportunities near you.</Hint>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <FieldGroup label="City">
          <TextInput value={draft.city} onChange={v => set('city', v)} placeholder="Portland" autoFocus />
        </FieldGroup>
        <FieldGroup label="State / Province">
          <TextInput value={draft.state} onChange={v => set('state', v)} placeholder="OR" />
        </FieldGroup>
        <div style={{ gridColumn: '1 / -1' }}>
          <FieldGroup label="Country">
            <TextInput value={draft.country} onChange={v => set('country', v)} placeholder="United States" />
          </FieldGroup>
        </div>
      </div>
      <FieldGroup label="Search radius" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <input
            type="range" min={5} max={100} step={5} value={draft.radius}
            onChange={e => set('radius', parseInt(e.target.value))}
            style={{ flex: 1, height: '4px', appearance: 'none', background: 'var(--stone-300)', borderRadius: '2px', outline: 'none', cursor: 'pointer' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color: 'var(--pink-500)', minWidth: '64px', textAlign: 'right' }}>
            {draft.radius} miles
          </span>
        </div>
      </FieldGroup>
      <div
        onClick={() => set('remote', !draft.remote)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'white',
          border: '1.5px solid var(--stone-300)', borderRadius: '10px', cursor: 'pointer',
        }}
      >
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ink-800)' }}>Remote OK</div>
          <div style={{ fontSize: '13px', color: 'var(--stone-500)', marginTop: '1px' }}>Include fully remote opportunities</div>
        </div>
        <Toggle on={draft.remote} />
      </div>
      <Actions onBack={onBack} onNext={onNext} />
    </>
  )
}

function StepChips({ question, hint, items, onChange, placeholder, chipStyle, onNext, onBack }: {
  question: React.ReactNode; hint: string
  items: string[]; onChange: (v: string[]) => void
  placeholder: string; chipStyle: React.CSSProperties
  onNext: () => void; onBack: () => void
}) {
  function add(value: string) {
    const v = value.trim()
    if (v && !items.includes(v)) onChange([...items, v])
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(e.currentTarget.value)
      e.currentTarget.value = ''
    }
  }

  return (
    <>
      <Question>{question}</Question>
      <Hint>{hint}</Hint>
      <ChipField items={items} onRemove={remove} onKey={onKey} onBlur={add} placeholder={placeholder} chipStyle={chipStyle} />
      <Actions onBack={onBack} onNext={onNext} />
    </>
  )
}

function Step6({ draft, set, onNext, onBack }: {
  draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void
  onNext: () => void; onBack: () => void
}) {
  const schedOpts: Array<{ value: 'weekly' | 'daily' | 'manual'; icon: string; label: string; sub: string }> = [
    { value: 'weekly',  icon: '📬', label: 'Weekly',  sub: 'Once a week' },
    { value: 'daily',   icon: '⚡', label: 'Daily',   sub: 'Every day' },
    { value: 'manual',  icon: '🎛️', label: 'Manual',  sub: "I'll check in myself" },
  ]
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const HOURS = [8,9,10,12,14,16,17,18,19,20]

  function fmtHour(h: number) {
    if (h < 12) return `${h}:00 am`
    if (h === 12) return '12:00 pm'
    return `${h - 12}:00 pm`
  }

  return (
    <>
      <Question>How do you want<br />to <Em>hear from us?</Em></Question>
      <Hint>We&rsquo;ll send you a digest when we find good matches.</Hint>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {schedOpts.map(opt => (
          <div
            key={opt.value}
            onClick={() => set('schedule', opt.value)}
            style={{
              padding: '14px 10px', borderRadius: '12px', textAlign: 'center',
              border: `1.5px solid ${draft.schedule === opt.value ? 'var(--pink-500)' : 'var(--stone-300)'}`,
              background: draft.schedule === opt.value ? 'var(--pink-50)' : 'white',
              cursor: 'pointer', transition: 'all 140ms ease',
            }}
          >
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{opt.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: draft.schedule === opt.value ? 'var(--pink-700)' : 'var(--ink-800)' }}>
              {opt.label}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--stone-500)', marginTop: '2px' }}>{opt.sub}</div>
          </div>
        ))}
      </div>
      {draft.schedule !== 'manual' && (
        <div style={{ display: 'grid', gridTemplateColumns: draft.schedule === 'weekly' ? '1fr 1fr' : '1fr', gap: '12px' }}>
          {draft.schedule === 'weekly' && (
            <FieldGroup label="Which day?">
              <select
                value={draft.day}
                onChange={e => set('day', e.target.value)}
                style={selectStyle}
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FieldGroup>
          )}
          <FieldGroup label="What time?">
            <select
              value={draft.hour}
              onChange={e => set('hour', parseInt(e.target.value))}
              style={selectStyle}
            >
              {HOURS.map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
            </select>
          </FieldGroup>
        </div>
      )}
      <Actions onBack={onBack} onNext={onNext} />
    </>
  )
}

function Step7({ draft, onFinish, saving }: { draft: Draft; onFinish: () => void; saving: boolean }) {
  const schedLabel = draft.schedule === 'manual'
    ? 'at your request'
    : draft.schedule === 'weekly'
    ? `every ${draft.day}`
    : 'every day'

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '24px',
        background: 'var(--success-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', margin: '0 auto 24px',
      }}>
        🌿
      </div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em',
        color: 'var(--ink-900)', marginBottom: '12px',
      }}>
        You&rsquo;re all set.
      </h1>
      <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'var(--ink-500)', maxWidth: '420px', margin: '0 auto 24px' }}>
        We&rsquo;re doing a first search for you now. You&rsquo;ll get an email within the next day or two when your matches are ready.
        <br /><br />
        In the meantime, feel free to update your preferences anytime in Settings.
      </p>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        background: 'var(--yellow-100)', color: 'var(--ink-600)',
        padding: '10px 18px', borderRadius: '999px',
        fontSize: '14px', fontWeight: 500, marginBottom: '28px',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="22 2 11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        We&rsquo;ll email you {schedLabel}
      </div>
      <br />
      <button
        onClick={onFinish}
        disabled={saving}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '14px 36px', borderRadius: '999px',
          background: saving ? 'var(--pink-300)' : 'var(--pink-500)', color: 'white', border: 'none',
          fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 16px oklch(64% 0.14 345 / 0.28)', transition: 'all 150ms ease',
        }}
      >
        {saving ? 'Saving…' : 'Take me to my dashboard →'}
      </button>
    </div>
  )
}

/* ── Shared primitives ── */

function FieldGroup({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ink-600)', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean
}) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '12px 16px',
        border: '1.5px solid var(--stone-300)', borderRadius: '10px', background: 'white',
        fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--ink-900)',
        outline: 'none', boxShadow: '0 1px 3px oklch(16% 0.04 60 / 0.05)',
        transition: 'border 150ms ease, box-shadow 150ms ease',
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--pink-500)'; e.target.style.boxShadow = '0 0 0 3px oklch(64% 0.14 345 / 0.12)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--stone-300)'; e.target.style.boxShadow = '0 1px 3px oklch(16% 0.04 60 / 0.05)' }}
    />
  )
}

function ChipField({ items, onRemove, onKey, onBlur, placeholder, chipStyle }: {
  items: string[]
  onRemove: (i: number) => void
  onKey: (e: KeyboardEvent<HTMLInputElement>) => void
  onBlur: (v: string) => void
  placeholder: string
  chipStyle: React.CSSProperties
}) {
  return (
    <div style={{
      background: 'white', border: '1.5px solid var(--stone-300)',
      borderRadius: '14px', padding: '12px 14px', minHeight: '80px',
      boxShadow: '0 1px 3px oklch(16% 0.04 60 / 0.05)',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: items.length ? '8px' : '0' }}>
        {items.map((c, i) => (
          <span
            key={i}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', ...chipStyle }}
            onClick={() => onRemove(i)}
          >
            {c}
            <span style={{ fontSize: '14px', lineHeight: 1, opacity: 0.5 }}>×</span>
          </span>
        ))}
      </div>
      <input
        autoFocus
        placeholder={items.length ? 'Add another…' : placeholder}
        onKeyDown={onKey}
        onBlur={e => { if (e.target.value.trim()) { onBlur(e.target.value); e.target.value = '' } }}
        style={{
          width: '100%', border: 'none', outline: 'none', background: 'none',
          fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-900)',
        }}
      />
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div style={{
      width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
      background: on ? 'var(--pink-500)' : 'var(--stone-300)', position: 'relative',
      transition: 'background 200ms ease',
    }}>
      <div style={{
        position: 'absolute', top: '3px', left: '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: 'white', boxShadow: '0 1px 3px oklch(16% 0.04 60 / 0.2)',
        transition: 'transform 200ms ease',
        transform: on ? 'translateX(20px)' : 'none',
      }} />
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid var(--stone-300)', borderRadius: '10px', background: 'white',
  fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--ink-800)',
  outline: 'none', cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px',
}
