import { BarChart3, Home, Moon, ReceiptText, Settings, Sun } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../app/ThemeProvider'
import { useLocale } from '../app/LocaleProvider'

export function AppShell() {
  const { theme, setTheme } = useTheme()
  const { t } = useLocale()
  const navigation = [
    { to: '/', label: t('home'), icon: Home, end: true },
    { to: '/transactions', label: t('transactions'), icon: ReceiptText },
    { to: '/insights', label: t('insights'), icon: BarChart3 },
    { to: '/settings', label: t('settings'), icon: Settings },
  ]
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label={t('primaryNavigation')}>
        <NavLink to="/" className="brand" aria-label={t('tapLedgerHome')}>TapLedger</NavLink>
        <nav className="sidebar-nav">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="theme-switch" aria-label={t('colorTheme')}>
            <button className={theme === 'light' ? 'selected' : ''} onClick={() => setTheme('light')} aria-label={t('lightMode')}><Sun /></button>
            <button className={theme === 'dark' ? 'selected' : ''} onClick={() => setTheme('dark')} aria-label={t('darkMode')}><Moon /></button>
          </div>
          <span className="sync-label"><span className="sync-dot" />{t('synced')}</span>
        </div>
      </aside>
      <main className="main-canvas"><Outlet /></main>
      <nav className="mobile-nav" aria-label={t('primaryNavigation')}>
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
