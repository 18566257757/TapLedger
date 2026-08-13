import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online ? null : (
    <div className="offline-banner" role="status">
      <WifiOff aria-hidden="true" /> Cloud service unavailable. New manual transactions stay on this device until you confirm sync.
    </div>
  )
}
