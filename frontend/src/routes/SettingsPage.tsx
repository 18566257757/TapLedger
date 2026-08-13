import { useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ChevronDown, CreditCard, Database, Download, KeyRound, LogOut, Moon, Plus, Server, ShieldCheck, Sun, Tags, UploadCloud, Workflow } from 'lucide-react'
import { useAuth } from '../app/AuthProvider'
import { useTheme } from '../app/ThemeProvider'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { readPendingTransactions, removePendingTransaction } from '../lib/pendingQueue'
import { useLocale, type Language } from '../app/LocaleProvider'

export function SettingsPage() {
  const { user, csrfToken, setAuthenticated, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t, language, locale, setLanguage, categoryLabel, methodTypeLabel, matchTypeLabel } = useLocale()
  const queryClient = useQueryClient()
  const [categoryName, setCategoryName] = useState('')
  const [methodName, setMethodName] = useState('')
  const [lastFour, setLastFour] = useState('')
  const [rulePattern, setRulePattern] = useState('')
  const [ruleCategory, setRuleCategory] = useState('')
  const [notice, setNotice] = useState('')
  const [revealedToken, setRevealedToken] = useState('')
  const [pending, setPending] = useState(readPendingTransactions)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [nickname, setNickname] = useState(user?.display_name ?? user?.username ?? '')
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const methods = useQuery({ queryKey: ['payment-methods'], queryFn: api.paymentMethods })
  const rules = useQuery({ queryKey: ['merchant-rules'], queryFn: api.merchantRules })
  const status = useQuery({ queryKey: ['status'], queryFn: api.status })
  const backups = useQuery({ queryKey: ['backups'], queryFn: api.backups })

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!csrfToken) throw new Error(t('sessionExpired'))
      return api.updateProfile(nickname, csrfToken)
    },
    onSuccess: (nextUser) => {
      setAuthenticated(nextUser, csrfToken!)
      setNotice(t('nicknameUpdated'))
    },
    onError: () => setNotice(t('nicknameUpdateFailed')),
  })

  const createCategory = useMutation({ mutationFn: () => api.createCategory({ name: categoryName, icon: 'circle' }, csrfToken!), onSuccess: async () => { setCategoryName(''); await queryClient.invalidateQueries({ queryKey: ['categories'] }) } })
  const createMethod = useMutation({ mutationFn: () => api.createPaymentMethod({ display_name: methodName, last_four: lastFour || null, method_type: 'credit_card', shortcut_match_text: methodName, icon: 'credit-card' }, csrfToken!), onSuccess: async () => { setMethodName(''); setLastFour(''); await queryClient.invalidateQueries({ queryKey: ['payment-methods'] }) } })
  const createRule = useMutation({ mutationFn: () => api.createRule({ pattern: rulePattern, match_type: 'contains', category_id: ruleCategory || null, priority: 100, is_enabled: true }, csrfToken!), onSuccess: async () => { setRulePattern(''); await queryClient.invalidateQueries({ queryKey: ['merchant-rules'] }) } })
  const updateCatalog = useMutation({
    mutationFn: async ({ kind, id, payload }: { kind: 'category' | 'method' | 'rule'; id: string; payload: Record<string, unknown> }) => {
      if (!csrfToken) throw new Error(t('sessionExpired'))
      if (kind === 'category') return await api.updateCategory(id, payload, csrfToken)
      if (kind === 'method') return await api.updatePaymentMethod(id, payload, csrfToken)
      return await api.updateRule(id, payload, csrfToken)
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['categories'] }), queryClient.invalidateQueries({ queryKey: ['payment-methods'] }), queryClient.invalidateQueries({ queryKey: ['merchant-rules'] })]) },
    onError: () => setNotice(t('updateFailed')),
  })
  const backup = useMutation({ mutationFn: () => api.createBackup(csrfToken!), onSuccess: async (item) => { setNotice(t('verifiedBackupCreated', { name: item.name })); await queryClient.invalidateQueries({ queryKey: ['backups'] }) }, onError: () => setNotice(t('backupFailed')) })
  const deleteAll = useMutation({ mutationFn: () => api.deleteAllData(deletePassword, deleteConfirmation, csrfToken!), onSuccess: async (result) => { setDeletePassword(''); setDeleteConfirmation(''); setNotice(t('deletedAfterBackup', { count: result.deleted_transactions, name: result.backup_name })); await Promise.all([queryClient.invalidateQueries(), queryClient.invalidateQueries({ queryKey: ['backups'] })]) }, onError: () => setNotice(t('deleteOperationFailed')) })

  const rotateToken = async () => {
    if (!csrfToken || !window.confirm(t('rotateTokenConfirm'))) return
    try {
      const result = await api.rotateToken(csrfToken)
      setRevealedToken(result.token)
      setNotice(t('tokenRotated'))
    } catch {
      setNotice(t('tokenRotationFailed'))
    }
  }

  const simulateImport = async () => {
    if (!csrfToken || !window.confirm(t('simulateConfirm'))) return
    try {
      await api.simulateImport(csrfToken)
      setNotice(t('simulatedAccepted', { result: t('reviewNeedsReview') }))
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['transactions'] }), queryClient.invalidateQueries({ queryKey: ['review'] })])
    } catch { setNotice(t('simulationFailed')) }
  }

  const syncPending = async () => {
    if (!csrfToken || !pending.length) return
    let completed = 0
    for (const item of pending) {
      try {
        await api.createTransaction(item.payload, csrfToken)
        removePendingTransaction(item.id)
        completed += 1
      } catch { break }
    }
    setPending(readPendingTransactions())
    setNotice(t('syncCompleted', { count: completed }))
    await queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  return (
    <div className="page settings-page">
      <header className="page-heading"><div><p className="eyebrow">{t('configuration')}</p><h1>{t('settings')}</h1><p>{t('settingsSubtitle')}</p></div><button className="secondary-button" onClick={() => void logout()}><LogOut />{t('signOut')}</button></header>
      {notice ? <div className="info-banner" role="status">{notice}</div> : null}
      <div className="settings-grid">
        <SettingCard icon={Workflow} title={t('automation')} description={t('automationDescription')}>
          <div className="setting-detail"><span>{t('importUrl')}</span><code>{`${window.location.origin}/api/v1/shortcut/transactions`}</code></div>
          <button className="secondary-button" onClick={() => void rotateToken()}><KeyRound />{t('rotateShortcutToken')}</button>
          <button className="secondary-button" onClick={() => void simulateImport()}><UploadCloud />{t('sendSimulatedImport')}</button>
          {revealedToken ? <div className="secret-reveal"><strong>{t('copyTokenNow')}</strong><code>{revealedToken}</code><button className="text-button" onClick={() => void navigator.clipboard.writeText(revealedToken)}>{t('copy')}</button></div> : null}
        </SettingCard>

        <SettingCard icon={Tags} title={t('categories')} description={t('activeCategories', { count: categories.data?.length ?? 0 })}>
          <div className="simple-list">{categories.data?.map((item) => <div key={item.id}><span>{categoryLabel(item.name, item.is_system)}</span>{item.is_system ? <small>{t('builtIn')}</small> : <button className="text-button" onClick={() => window.confirm(t('archiveCategoryConfirm', { name: item.name })) && updateCatalog.mutate({ kind: 'category', id: item.id, payload: { is_archived: true } })}>{t('archive')}</button>}</div>)}</div>
          <form className="inline-form" onSubmit={(event) => { event.preventDefault(); createCategory.mutate() }}><input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder={t('newCategory')} /><button className="secondary-button"><Plus />{t('add')}</button></form>
        </SettingCard>

        <SettingCard icon={CreditCard} title={t('paymentMethods')} description={t('paymentMethodsDescription')}>
          <div className="simple-list">{methods.data?.map((item) => <div key={item.id}><span>{item.display_name}</span><span className="list-actions"><small>{item.last_four ? `•••• ${item.last_four}` : methodTypeLabel(item.method_type)}</small><button className="text-button" onClick={() => window.confirm(t('archiveMethodConfirm', { name: item.display_name })) && updateCatalog.mutate({ kind: 'method', id: item.id, payload: { is_archived: true } })}>{t('archive')}</button></span></div>)}</div>
          <form className="inline-form three" onSubmit={(event) => { event.preventDefault(); createMethod.mutate() }}><input required value={methodName} onChange={(event) => setMethodName(event.target.value)} placeholder={t('displayName')} /><input value={lastFour} pattern="[0-9]{4}" maxLength={4} onChange={(event) => setLastFour(event.target.value)} placeholder={t('lastFour')} /><button className="secondary-button"><Plus />{t('add')}</button></form>
        </SettingCard>

        <SettingCard icon={ShieldCheck} title={t('merchantRules')} description={t('classificationRules', { count: rules.data?.length ?? 0 })}>
          <div className="simple-list">{rules.data?.slice(0, 8).map((item) => <div key={item.id}><span>{item.pattern}</span><span className="list-actions"><small>{matchTypeLabel(item.match_type)} · {t('priority')} {item.priority}</small><button className="text-button" onClick={() => updateCatalog.mutate({ kind: 'rule', id: item.id, payload: { is_enabled: !item.is_enabled } })}>{item.is_enabled ? t('disable') : t('enable')}</button></span></div>)}</div>
          <form className="inline-form three" onSubmit={(event) => { event.preventDefault(); createRule.mutate() }}><input required value={rulePattern} onChange={(event) => setRulePattern(event.target.value)} placeholder={t('merchantContains')} /><select value={ruleCategory} onChange={(event) => setRuleCategory(event.target.value)}><option value="">{t('noCategory')}</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{categoryLabel(item.name, item.is_system)}</option>)}</select><button className="secondary-button"><Plus />{t('add')}</button></form>
        </SettingCard>

        <SettingCard icon={Database} title={t('dataBackups')} description={t('dataBackupsDescription')}>
          <div className="pending-sync"><span>{t('pendingTransactions', { count: pending.length })}</span><button className="secondary-button" disabled={!pending.length} onClick={() => void syncPending()}><UploadCloud />{t('confirmSync')}</button></div>
          <div className="button-row"><a className="secondary-button" href="/api/v1/export/csv"><Download />{t('exportCsv')}</a><a className="secondary-button" href="/api/v1/export/json"><Download />{t('exportJson')}</a><button className="primary-button" disabled={backup.isPending} onClick={() => backup.mutate()}><Archive />{backup.isPending ? t('creating') : t('backupNow')}</button></div>
          <div className="simple-list">{backups.data?.items.slice(0, 3).map((item) => <div key={item.name}><span>{item.name}</span><small>{(item.size_bytes / 1024).toFixed(1)} KB</small></div>)}{!backups.data?.items.length ? <p>{t('noBackups')}</p> : null}</div>
          <details className="danger-zone"><summary>{t('deleteAllFinancialData')}</summary><p>{t('backupBeforeDelete')}</p><input type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder={t('administratorPassword')} /><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={t('typeDeleteAllData')} /><button className="danger-button" disabled={deleteAll.isPending || deleteConfirmation !== 'DELETE ALL DATA' || !deletePassword} onClick={() => window.confirm(t('deleteAllConfirm')) && deleteAll.mutate()}>{t('deleteAllData')}</button></details>
        </SettingCard>

        <SettingCard icon={Server} title={t('serverStatus')} description={t('cloudDiagnostics')}>
          <dl className="status-grid"><div><dt>{t('service')}</dt><dd className="healthy">{status.data ? t('healthy') : t('checking')}</dd></div><div><dt>{t('database')}</dt><dd className="healthy">{status.data ? t('healthy') : t('checking')}</dd></div><div><dt>{t('databaseSize')}</dt><dd>{status.data ? `${(status.data.database_size / 1024).toFixed(1)} KB` : '—'}</dd></div><div><dt>{t('pendingReviews')}</dt><dd>{status.data?.pending_reviews ?? '—'}</dd></div><div><dt>{t('lastImport')}</dt><dd>{status.data?.last_import ? formatDateTime(status.data.last_import, locale) : t('noneYet')}</dd></div><div><dt>{t('lastBackup')}</dt><dd>{status.data?.last_backup ?? t('noneYet')}</dd></div><div><dt>{t('versionUptime')}</dt><dd>{status.data ? `${status.data.version} · ${t('minutes', { count: Math.floor(status.data.uptime_seconds / 60) })}` : '—'}</dd></div></dl>
          {status.data ? <div className="setting-detail"><span>{t('databaseBinding')}</span><code>{status.data.database_binding}</code></div> : null}
          <p className="muted-copy">{status.data?.deployment_url ? t('deploymentUrl', { url: status.data.deployment_url }) : t('cloudInfoUnavailable')}</p>
        </SettingCard>

        <SettingCard icon={Tags} title={t('preferences')} description={t('preferencesDescription')}>
          <div className="preference-field mobile-theme-preference">
            <span>{t('colorTheme')}</span>
            <div className="theme-switch preference-theme" role="group" aria-label={t('colorTheme')}>
              <button type="button" className={theme === 'light' ? 'selected' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Sun /><span>{t('lightMode')}</span></button>
              <button type="button" className={theme === 'dark' ? 'selected' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Moon /><span>{t('darkMode')}</span></button>
            </div>
          </div>
          <label className="preference-field"><span>{t('language')}</span><select value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="auto">{t('followBrowser')}</option><option value="en">{t('english')}</option><option value="zh-CN">{t('simplifiedChinese')}</option><option value="zh-TW">{t('traditionalChinese')}</option></select></label>
          <form className="inline-form preference-nickname" onSubmit={(event) => { event.preventDefault(); updateProfile.mutate() }}><label><span>{t('nickname')}</span><small>{t('nicknameDescription')}</small><input required maxLength={80} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label><button className="secondary-button" disabled={updateProfile.isPending}>{updateProfile.isPending ? t('savingNickname') : t('saveNickname')}</button></form>
        </SettingCard>
      </div>
    </div>
  )
}

function SettingCard({ icon: Icon, title, description, children }: { icon: typeof Workflow; title: string; description: string; children: ReactNode }) {
  return <details className="card setting-card"><summary className="setting-summary"><span className="setting-icon"><Icon /></span><div><h2>{title}</h2><p>{description}</p></div><ChevronDown className="setting-chevron" /></summary><div className="setting-body">{children}</div></details>
}
