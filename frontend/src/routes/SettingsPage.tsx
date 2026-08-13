import { useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, CreditCard, Database, Download, KeyRound, LogOut, Plus, Server, ShieldCheck, Tags, UploadCloud, Workflow } from 'lucide-react'
import { useAuth } from '../app/AuthProvider'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { readPendingTransactions, removePendingTransaction } from '../lib/pendingQueue'
import { useLocale, type Language } from '../app/LocaleProvider'

export function SettingsPage() {
  const { csrfToken, logout } = useAuth()
  const { t, language, setLanguage } = useLocale()
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
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const methods = useQuery({ queryKey: ['payment-methods'], queryFn: api.paymentMethods })
  const rules = useQuery({ queryKey: ['merchant-rules'], queryFn: api.merchantRules })
  const status = useQuery({ queryKey: ['status'], queryFn: api.status })
  const backups = useQuery({ queryKey: ['backups'], queryFn: api.backups })

  const createCategory = useMutation({ mutationFn: () => api.createCategory({ name: categoryName, icon: 'circle' }, csrfToken!), onSuccess: async () => { setCategoryName(''); await queryClient.invalidateQueries({ queryKey: ['categories'] }) } })
  const createMethod = useMutation({ mutationFn: () => api.createPaymentMethod({ display_name: methodName, last_four: lastFour || null, method_type: 'credit_card', icon: 'credit-card' }, csrfToken!), onSuccess: async () => { setMethodName(''); setLastFour(''); await queryClient.invalidateQueries({ queryKey: ['payment-methods'] }) } })
  const createRule = useMutation({ mutationFn: () => api.createRule({ pattern: rulePattern, match_type: 'contains', category_id: ruleCategory || null, priority: 100, is_enabled: true }, csrfToken!), onSuccess: async () => { setRulePattern(''); await queryClient.invalidateQueries({ queryKey: ['merchant-rules'] }) } })
  const updateCatalog = useMutation({
    mutationFn: async ({ kind, id, payload }: { kind: 'category' | 'method' | 'rule'; id: string; payload: Record<string, unknown> }) => {
      if (!csrfToken) throw new Error('Session expired')
      if (kind === 'category') return await api.updateCategory(id, payload, csrfToken)
      if (kind === 'method') return await api.updatePaymentMethod(id, payload, csrfToken)
      return await api.updateRule(id, payload, csrfToken)
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['categories'] }), queryClient.invalidateQueries({ queryKey: ['payment-methods'] }), queryClient.invalidateQueries({ queryKey: ['merchant-rules'] })]) },
    onError: (error) => setNotice(error instanceof Error ? error.message : 'Update failed'),
  })
  const backup = useMutation({ mutationFn: () => api.createBackup(csrfToken!), onSuccess: async (item) => { setNotice(`Verified backup created: ${item.name}`); await queryClient.invalidateQueries({ queryKey: ['backups'] }) }, onError: (error) => setNotice(error instanceof Error ? error.message : 'Backup failed') })
  const deleteAll = useMutation({ mutationFn: () => api.deleteAllData(deletePassword, deleteConfirmation, csrfToken!), onSuccess: async (result) => { setDeletePassword(''); setDeleteConfirmation(''); setNotice(`${result.deleted_transactions} transactions deleted after backup ${result.backup_name}.`); await Promise.all([queryClient.invalidateQueries(), queryClient.invalidateQueries({ queryKey: ['backups'] })]) }, onError: (error) => setNotice(error instanceof Error ? error.message : 'Delete failed') })

  const rotateToken = async () => {
    if (!csrfToken || !window.confirm('Rotate the Shortcut token? The current iPhone Shortcut will stop importing until you update it.')) return
    try {
      const result = await api.rotateToken(csrfToken)
      setRevealedToken(result.token)
      setNotice(result.warning)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Token rotation failed')
    }
  }

  const simulateImport = async () => {
    if (!csrfToken || !window.confirm('Create one clearly labeled simulated transaction for testing?')) return
    try {
      const result = await api.simulateImport(csrfToken)
      setNotice(`Simulated import accepted: ${result.result}`)
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['transactions'] }), queryClient.invalidateQueries({ queryKey: ['review'] })])
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Simulation failed') }
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
    setNotice(`${completed} offline transaction${completed === 1 ? '' : 's'} synced with server confirmation.`)
    await queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  return (
    <div className="page settings-page">
      <header className="page-heading"><div><p className="eyebrow">{t('configuration')}</p><h1>{t('settings')}</h1><p>{t('settingsSubtitle')}</p></div><button className="secondary-button" onClick={() => void logout()}><LogOut />{t('signOut')}</button></header>
      {notice ? <div className="info-banner" role="status">{notice}</div> : null}
      <div className="settings-grid">
        <SettingCard icon={Workflow} title={t('automation')} description="Private endpoint for your iPhone Shortcut.">
          <div className="setting-detail"><span>Import URL</span><code>{`${window.location.origin}/api/v1/shortcut/transactions`}</code></div>
          <button className="secondary-button" onClick={() => void rotateToken()}><KeyRound />Rotate Shortcut token</button>
          <button className="secondary-button" onClick={() => void simulateImport()}><UploadCloud />Send simulated import</button>
          {revealedToken ? <div className="secret-reveal"><strong>Copy this token now</strong><code>{revealedToken}</code><button className="text-button" onClick={() => void navigator.clipboard.writeText(revealedToken)}>Copy</button></div> : null}
        </SettingCard>

        <SettingCard icon={Tags} title={t('categories')} description={`${categories.data?.length ?? 0} active categories`}>
          <div className="simple-list">{categories.data?.map((item) => <div key={item.id}><span>{item.name}</span>{item.is_system ? <small>Built in</small> : <button className="text-button" onClick={() => window.confirm(`Archive category “${item.name}”?`) && updateCatalog.mutate({ kind: 'category', id: item.id, payload: { is_archived: true } })}>Archive</button>}</div>)}</div>
          <form className="inline-form" onSubmit={(event) => { event.preventDefault(); createCategory.mutate() }}><input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category" /><button className="secondary-button"><Plus />Add</button></form>
        </SettingCard>

        <SettingCard icon={CreditCard} title={t('paymentMethods')} description="Cards and wallets recognized by imports.">
          <div className="simple-list">{methods.data?.map((item) => <div key={item.id}><span>{item.display_name}</span><span className="list-actions"><small>{item.last_four ? `•••• ${item.last_four}` : item.method_type.replaceAll('_', ' ')}</small><button className="text-button" onClick={() => window.confirm(`Archive payment method “${item.display_name}”?`) && updateCatalog.mutate({ kind: 'method', id: item.id, payload: { is_archived: true } })}>Archive</button></span></div>)}</div>
          <form className="inline-form three" onSubmit={(event) => { event.preventDefault(); createMethod.mutate() }}><input required value={methodName} onChange={(event) => setMethodName(event.target.value)} placeholder="Display name" /><input value={lastFour} pattern="[0-9]{4}" maxLength={4} onChange={(event) => setLastFour(event.target.value)} placeholder="Last 4" /><button className="secondary-button"><Plus />Add</button></form>
        </SettingCard>

        <SettingCard icon={ShieldCheck} title={t('merchantRules')} description={`${rules.data?.length ?? 0} classification rules`}>
          <div className="simple-list">{rules.data?.slice(0, 8).map((item) => <div key={item.id}><span>{item.pattern}</span><span className="list-actions"><small>{item.match_type} · priority {item.priority}</small><button className="text-button" onClick={() => updateCatalog.mutate({ kind: 'rule', id: item.id, payload: { is_enabled: !item.is_enabled } })}>{item.is_enabled ? 'Disable' : 'Enable'}</button></span></div>)}</div>
          <form className="inline-form three" onSubmit={(event) => { event.preventDefault(); createRule.mutate() }}><input required value={rulePattern} onChange={(event) => setRulePattern(event.target.value)} placeholder="Merchant contains" /><select value={ruleCategory} onChange={(event) => setRuleCategory(event.target.value)}><option value="">No category</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="secondary-button"><Plus />Add</button></form>
        </SettingCard>

        <SettingCard icon={Database} title={t('dataBackups')} description="Exports are never uploaded by TapLedger.">
          <div className="pending-sync"><span><strong>{pending.length}</strong> transactions waiting on this device</span><button className="secondary-button" disabled={!pending.length} onClick={() => void syncPending()}><UploadCloud />Confirm sync</button></div>
          <div className="button-row"><a className="secondary-button" href="/api/v1/export/csv"><Download />Export CSV</a><a className="secondary-button" href="/api/v1/export/json"><Download />Export JSON</a><button className="primary-button" disabled={backup.isPending} onClick={() => backup.mutate()}><Archive />{backup.isPending ? 'Creating...' : 'Back up now'}</button></div>
          <div className="simple-list">{backups.data?.items.slice(0, 3).map((item) => <div key={item.name}><span>{item.name}</span><small>{(item.size_bytes / 1024).toFixed(1)} KB</small></div>)}{!backups.data?.items.length ? <p>No backups yet.</p> : null}</div>
          <details className="danger-zone"><summary>Delete all financial data</summary><p>A verified backup is created first. Administrator and preferences are retained.</p><input type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Administrator password" /><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Type DELETE ALL DATA" /><button className="danger-button" disabled={deleteAll.isPending || deleteConfirmation !== 'DELETE ALL DATA' || !deletePassword} onClick={() => window.confirm('Permanently delete all financial data after creating a backup?') && deleteAll.mutate()}>Delete all data</button></details>
        </SettingCard>

        <SettingCard icon={Server} title={t('serverStatus')} description="Live diagnostics for this Windows host.">
          <dl className="status-grid"><div><dt>Service</dt><dd className="healthy">{status.data?.service_health ?? 'Checking...'}</dd></div><div><dt>Database</dt><dd className="healthy">{status.data?.database_health ?? 'Checking...'}</dd></div><div><dt>Database size</dt><dd>{status.data ? `${(status.data.database_size / 1024).toFixed(1)} KB` : '—'}</dd></div><div><dt>Pending reviews</dt><dd>{status.data?.pending_reviews ?? '—'}</dd></div><div><dt>Last import</dt><dd>{status.data?.last_import ? formatDateTime(status.data.last_import) : 'None yet'}</dd></div><div><dt>Last backup</dt><dd>{status.data?.last_backup ?? 'None yet'}</dd></div><div><dt>Version / uptime</dt><dd>{status.data ? `${status.data.version} · ${Math.floor(status.data.uptime_seconds / 60)} min` : '—'}</dd></div></dl>
          {status.data ? <div className="setting-detail"><span>Database path</span><code>{status.data.database_path}</code></div> : null}
          {status.data?.tailscale_url ? <div className="setting-detail"><span>Private URL</span><code>{status.data.tailscale_url}</code></div> : <p className="muted-copy">Tailscale Serve is not configured yet. The local app remains available only on this computer.</p>}
        </SettingCard>

        <SettingCard icon={Tags} title={t('preferences')} description="Appearance and regional display settings.">
          <label className="preference-field"><span>{t('language')}</span><select value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="auto">{t('followBrowser')}</option><option value="en">{t('english')}</option><option value="zh-CN">{t('simplifiedChinese')}</option><option value="zh-TW">{t('traditionalChinese')}</option></select></label>
        </SettingCard>
      </div>
    </div>
  )
}

function SettingCard({ icon: Icon, title, description, children }: { icon: typeof Workflow; title: string; description: string; children: ReactNode }) {
  return <section className="card setting-card"><header><span className="setting-icon"><Icon /></span><div><h2>{title}</h2><p>{description}</p></div></header><div className="setting-body">{children}</div></section>
}
