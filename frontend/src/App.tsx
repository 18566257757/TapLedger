import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './app/AuthProvider'
import { AppShell } from './components/AppShell'
import { OnlineStatus } from './components/OnlineStatus'

const AuthPage = lazy(() => import('./routes/AuthPage').then((module) => ({ default: module.AuthPage })))
const HomePage = lazy(() => import('./routes/HomePage').then((module) => ({ default: module.HomePage })))
const InsightsPage = lazy(() => import('./routes/InsightsPage').then((module) => ({ default: module.InsightsPage })))
const ReviewPage = lazy(() => import('./routes/ReviewPage').then((module) => ({ default: module.ReviewPage })))
const SettingsPage = lazy(() => import('./routes/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const TransactionsPage = lazy(() => import('./routes/TransactionsPage').then((module) => ({ default: module.TransactionsPage })))

function ProtectedShell() {
  const { user, isRestoring } = useAuth()
  if (isRestoring) return <div className="auth-screen"><div className="loading-line">Loading TapLedger...</div></div>
  if (!user) return <Navigate to="/login" replace />
  return <><OnlineStatus /><AppShell /></>
}

export function App() {
  return <Suspense fallback={<div className="auth-screen"><div className="loading-line">Loading view...</div></div>}><Routes>
    <Route path="/login" element={<AuthPage />} />
    <Route element={<ProtectedShell />}>
      <Route index element={<HomePage />} />
      <Route path="transactions" element={<TransactionsPage />} />
      <Route path="insights" element={<InsightsPage />} />
      <Route path="review" element={<ReviewPage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>
}
