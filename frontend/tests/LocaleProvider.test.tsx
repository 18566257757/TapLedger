import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LocaleProvider, useLocale } from '../src/app/LocaleProvider'

function LanguageProbe() {
  const { t, setLanguage, categoryLabel, sourceLabel, reviewStatusLabel } = useLocale()
  return <><span>{t('settings')}</span><span>{t('automationDescription')}</span><span>{categoryLabel('Dining')}</span><span>{sourceLabel('wallet_shortcut')}</span><span>{reviewStatusLabel('missing_information')}</span><button onClick={() => setLanguage('zh-CN')}>中文</button><button onClick={() => setLanguage('en')}>English</button></>
}

describe('LocaleProvider', () => {
  it('lets the user override the browser language', async () => {
    localStorage.setItem('tapledger-language', 'en')
    render(<LocaleProvider><LanguageProbe /></LocaleProvider>)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '中文' }))
    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.getByText('供 iPhone 快捷指令使用的私人接口。')).toBeInTheDocument()
    expect(screen.getByText('餐饮')).toBeInTheDocument()
    expect(screen.getByText('iPhone 快捷指令')).toBeInTheDocument()
    expect(screen.getByText('信息缺失')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('zh-CN')

    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Dining')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })
})
