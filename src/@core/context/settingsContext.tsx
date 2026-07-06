// ** React Imports
import { createContext, useState, ReactNode, useEffect } from 'react'

// ** MUI Imports
import { PaletteMode } from '@mui/material'

// ** ThemeConfig Import
import themeConfig from 'src/configs/themeConfig'

// ** Types Import
import { ThemeColor, ContentWidth } from 'src/@core/layouts/types'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'

export type Settings = {
  mode: PaletteMode
  themeColor: ThemeColor
  contentWidth: ContentWidth
  language: string
}

export type SettingsContextValue = {
  settings: Settings
  saveSettings: (updatedSettings: Settings) => void
}

const initialSettings: Settings = {
  themeColor: 'primary',
  mode: themeConfig.mode,
  contentWidth: themeConfig.contentWidth,
  language: 'fr'
}

// ** Create Context
export const SettingsContext = createContext<SettingsContextValue>({
  saveSettings: () => null,
  settings: initialSettings
})

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  // ** State
  const [settings, setSettings] = useState<Settings>({ ...initialSettings })
  const { i18n } = useTranslation()
  const router = useRouter()

  useEffect(() => {
    if (localStorage.getItem('settings')) {
      const settings = localStorage.getItem('settings')

      if (settings) {
        const settingsData = JSON.parse(settings)
        saveSettings(settingsData)
        if (
          settingsData &&
          settingsData.language != i18n.language &&
          settingsData.language &&
          i18n &&
          typeof i18n.changeLanguage == 'function'
        ) {
          i18n?.changeLanguage(settingsData.language)
          const { pathname, asPath, query } = router
          router.push({ pathname, query }, asPath, { locale: settingsData.language })
        }
      }
    }
  }, [router, i18n])

  const saveSettings = (updatedSettings: Settings) => {
    setSettings(updatedSettings)
    localStorage.setItem('settings', JSON.stringify(updatedSettings))
  }

  return <SettingsContext.Provider value={{ settings, saveSettings }}>{children}</SettingsContext.Provider>
}

export const SettingsConsumer = SettingsContext.Consumer
