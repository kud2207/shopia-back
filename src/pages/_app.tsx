// ** Next Imports
import Head from 'next/head'
import { Router } from 'next/router'
import type { NextPage } from 'next'
import type { AppProps } from 'next/app'
import { CookiesProvider } from 'react-cookie'

import { appWithTranslation } from 'next-i18next'

// ** Loader Import
import NProgress from 'nprogress'

// ** Emotion Imports
import { CacheProvider } from '@emotion/react'
import type { EmotionCache } from '@emotion/cache'

// ** Config Imports
import themeConfig from 'src/configs/themeConfig'

// ** Component Imports
import UserLayout from 'src/layouts/UserLayout'
import ThemeComponent from 'src/@core/theme/ThemeComponent'

// ** Contexts
import { SettingsConsumer, SettingsProvider } from 'src/@core/context/settingsContext'

// ** Utils Imports
import { createEmotionCache } from 'src/@core/utils/create-emotion-cache'

// ** React Perfect Scrollbar Style
import 'react-perfect-scrollbar/dist/css/styles.css'

// ** Global css styles
import '../../styles/globals.css'
import "flatpickr/dist/flatpickr.min.css";
import "../../styles/satoshi.css";
import "../../styles/style.css";
import { GlobalProvider } from 'src/@core/context/globalContext'
import { SocketContextProvider } from 'src/@core/context/socketContext'
import Script from 'next/script'

// ** Extend App Props with Emotion
type ExtendedAppProps = AppProps & {
  Component: NextPage
  emotionCache: EmotionCache
}

const clientSideEmotionCache = createEmotionCache()

// ** Pace Loader
if (themeConfig.routingLoader) {
  Router.events.on('routeChangeStart', () => {
    NProgress.start()
  })
  Router.events.on('routeChangeError', () => {
    NProgress.done()
  })
  Router.events.on('routeChangeComplete', () => {
    NProgress.done()
  })
}

// ** Configure JSS & ClassName
const App = (props: ExtendedAppProps) => {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props
  // Variables
  const getLayout = Component.getLayout ?? (page => <UserLayout>{page}</UserLayout>)
  return (
    <>
      {Component.defaultProps?.isHome ? (
        <CookiesProvider>
          <CacheProvider value={emotionCache}>{getLayout(<Component {...pageProps} />)}</CacheProvider>
        </CookiesProvider>
      ) : (
        <CookiesProvider>
          <Script async strategy='afterInteractive' src='https://cdn.cinetpay.com/seamless/main.js'></Script>
          <CacheProvider value={emotionCache}>
            <Head>
              <title>{`${themeConfig.templateName} - Booster vos ventes grace à la puissance de L'IA`}</title>
              <meta
                name='description'
                content={`${themeConfig.templateName} – Booster votre commerce grace à la puissance de L'IA – Cloncluez raidement les ventes.`}
              />
              <meta
                name='keywords'
                content='IA, AI, WhatsApp, Vente en ligne, Boostez vos vente, vendre sur WhatsApp, sale, sale online, intelligence artificiele, ecommerce & IA'
              />
              <meta name='viewport' content='initial-scale=1, width=device-width' />
            </Head>

            <SettingsProvider>
              <GlobalProvider>
                <SocketContextProvider>
                  <SettingsConsumer>
                    {({ settings }) => {
                      return (
                        <ThemeComponent settings={settings}>{getLayout(<Component {...pageProps} />)}</ThemeComponent>
                      )
                    }}
                  </SettingsConsumer>
                </SocketContextProvider>
              </GlobalProvider>
            </SettingsProvider>
          </CacheProvider>
        </CookiesProvider>
      )}
    </>
  )
}

export default appWithTranslation(App)
