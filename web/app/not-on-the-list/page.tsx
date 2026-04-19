export default function NotOnTheListPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--stone-50)',
      padding: '32px 16px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '20px',
        background: 'var(--stone-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '28px', marginBottom: '24px',
      }}>
        📋
      </div>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800,
        letterSpacing: '-0.03em', color: 'var(--ink-900)',
        marginBottom: '12px',
      }}>
        You&rsquo;re not on the list&nbsp;yet.
      </h1>

      <p style={{
        fontSize: '16px', lineHeight: 1.7, color: 'var(--ink-500)',
        maxWidth: '400px', marginBottom: '32px',
      }}>
        Shortlisty is currently invite-only. If you think this is a mistake,
        reach out to whoever sent you here.
      </p>

      <a
        href="/login"
        style={{
          fontSize: '14px', fontWeight: 600,
          color: 'var(--pink-500)', textDecoration: 'none',
        }}
        onMouseEnter={undefined}
      >
        ← Try a different email
      </a>
    </div>
  )
}
