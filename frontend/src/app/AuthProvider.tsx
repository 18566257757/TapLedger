import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { User } from '../types/api'
import { api } from '../lib/api'

interface AuthContextValue {
  user: User | null
  csrfToken: string | null
  setAuthenticated: (user: User, csrfToken: string) => void
  clearAuthentication: () => void
  logout: () => Promise<void>
  isRestoring: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    let active = true
    api.refreshCsrf()
      .then((response) => {
        if (active) {
          setUser(response.user)
          setCsrfToken(response.csrf_token)
        }
      })
      .catch(() => undefined)
      .finally(() => active && setIsRestoring(false))
    return () => { active = false }
  }, [])

  const setAuthenticated = useCallback((nextUser: User, token: string) => {
    setUser(nextUser)
    setCsrfToken(token)
  }, [])

  const clearAuthentication = useCallback(() => {
    setUser(null)
    setCsrfToken(null)
  }, [])

  const logout = useCallback(async () => {
    if (csrfToken) await api.logout(csrfToken)
    clearAuthentication()
  }, [csrfToken, clearAuthentication])

  const value = useMemo(
    () => ({ user, csrfToken, setAuthenticated, clearAuthentication, logout, isRestoring }),
    [user, csrfToken, setAuthenticated, clearAuthentication, logout, isRestoring],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
