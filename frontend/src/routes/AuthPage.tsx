import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useAuth } from '../app/AuthProvider'
import { api } from '../lib/api'
import { useLocale } from '../app/LocaleProvider'

export function AuthPage() {
  const { user, setAuthenticated, isRestoring } = useAuth()
  const { t } = useLocale()
  const setup = useQuery({ queryKey: ['setup-status'], queryFn: api.setupStatus })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [baseCurrency, setBaseCurrency] = useState('HKD')
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Hong_Kong')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (user) return <Navigate to="/" replace />
  if (isRestoring || setup.isLoading) {
    return <div className="auth-screen"><div className="loading-line">{t('loadingTapLedger')}</div></div>
  }
  const isSetup = setup.data?.setup_required ?? false

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = isSetup
        ? await api.setupAdmin({ username, password, base_currency: baseCurrency, timezone })
        : await api.login(username, password)
      setAuthenticated(response.user, response.csrf_token)
    } catch {
      setError(t('authenticationFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-mark"><LockKeyhole aria-hidden="true" /></div>
        <p className="auth-brand">TapLedger</p>
        <h1>{isSetup ? t('setupPrivate') : t('welcomeBack')}</h1>
        <p>{isSetup ? t('firstUseHint') : t('ledgerReady')}</p>
        <div className="local-status"><CheckCircle2 />{t('privateDatabase')} · {t('synced')}</div>
        <form onSubmit={submit}>
          <label>{t('username')}<input aria-label={t('username')} autoComplete="username" minLength={3} required value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          <label>{t('password')}<span className="password-control"><input aria-label={t('password')} type={showPassword ? 'text' : 'password'} autoComplete={isSetup ? 'new-password' : 'current-password'} minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('hidePassword') : t('showPassword')}>{showPassword ? <EyeOff /> : <Eye />}</button></span>{isSetup ? <small>{t('passwordHint')}</small> : null}</label>
          {isSetup ? (
            <div className="auth-grid">
              <label>{t('baseCurrency')}<select value={baseCurrency} onChange={(event) => setBaseCurrency(event.target.value)}>{['HKD', 'CNY', 'USD', 'CAD', 'JPY', 'EUR', 'GBP'].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>{t('timezone')}<input value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>
            </div>
          ) : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? '...' : isSetup ? t('createAdmin') : t('signIn')}</button>
        </form>
        <p className="auth-footnote">{t('selfHostedPrivacy')}</p>
      </section>
    </main>
  )
}
