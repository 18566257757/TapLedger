import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LocaleProvider, useLocale } from '../src/app/LocaleProvider'

function LanguageProbe() {
  const { t, setLanguage } = useLocale()
  return <><span>{t('settings')}</span><button onClick={() => setLanguage('zh-CN')}>中文</button></>
}

describe('LocaleProvider', () => {
  it('lets the user override the browser language', async () => {
    localStorage.setItem('tapledger-language', 'en')
    render(<LocaleProvider><LanguageProbe /></LocaleProvider>)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '中文' }))
    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('zh-CN')
  })
})
