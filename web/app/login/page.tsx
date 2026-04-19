import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
      background: 'var(--stone-50)',
    }}>
      {/* Wordmark */}
      <a href="/" style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        textDecoration: 'none', marginBottom: '48px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5px' }}>
          <span style={{ display: 'block', width: '18px', height: '3px', borderRadius: '2px', background: 'var(--pink-500)' }} />
          <span style={{ display: 'block', width: '13px', height: '3px', borderRadius: '2px', background: 'var(--teal-500)' }} />
          <span style={{ display: 'block', width: '16px', height: '3px', borderRadius: '2px', background: 'var(--yellow-400)' }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '18px', fontWeight: 800,
          letterSpacing: '-0.03em', color: 'var(--ink-900)',
        }}>
          Shortlisty
          <em style={{ fontStyle: 'normal', color: 'var(--pink-500)', fontWeight: 400, fontSize: '14px' }}>.ai</em>
        </span>
      </a>

      <LoginForm />
    </div>
  )
}
