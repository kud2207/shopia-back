// ** MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// ** Demo Components Imports
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import moment from 'moment'
import 'moment/locale/fr'
import { convertCurrency, getGeoInfo, getSetting, getUserById } from 'src/@apiCore/npoints'
import { Alert, Box, Button, Skeleton } from '@mui/material'
import Payment from 'src/views/account-settings/Payment'
import { formatNumber } from 'src/@core/utils/format-currency'
import { useRouter } from 'next/router'

moment.locale('fr')

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common']))
    }
  }
}

const Plans = () => {
  const { t } = useTranslation('common')
  const { user, activeShop } = useGlobalContext()
  const [setting, setSetting] = useState<any>(null)
  const [load, setLoad] = useState(true)
  const [open, setOpen] = useState(false)
  const [refresh, setRefresh] = useState(false)

  const [location, setLocation] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [taux, setTaux] = useState<any>(1)
  const router = useRouter()

  useEffect(() => {
    setLoad(true)
    if (!location)
      getGeoInfo().then(response => {
        setLocation(response?.data)
      })
    if (!setting)
      getSetting()
        .then(response => {
          if (response.status == 200) setSetting(response.data.data)
        })
        .finally(() => setLoad(false))
    if (user)
      getUserById(user?._id)
        .then(response => {
          if (response.status == 200) setUserData(response.data.data)
        })
        .finally(() => setLoad(false))
  }, [location, user, refresh])

  useEffect(() => {
    if (activeShop && activeShop.currency != 'USD') {
      convertCurrency('USD', activeShop.currency == 'FCFA' ? 'XAF' : activeShop.currency).then(val => {
        if (val) setTaux(val)
      })
    }
  }, [activeShop])
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h5'>{t('billing1')}</Typography>
        <Typography variant='h6' mt={5}>
          {t('solde')}
        </Typography>
        {!load && userData && taux ? (
          <Typography variant='h4' mt={1}>
            {formatNumber((userData?.aiAmount * taux).toFixed(2))} {activeShop?.currency}
          </Typography>
        ) : (
          <Skeleton variant='text' height={50} width={100} sx={{ fontSize: '1rem', mt: 1 }} />
        )}
        <Box mt={4}>
          <Alert severity='info' variant='outlined' sx={{ '& a': { fontWeight: 400 } }}>
            <Typography variant='h6'>{t('how_work')}</Typography>
            <Typography variant='body1'>
              {t('billing_text')}
              <br />
              {setting && taux ? (
                <Box mt={2}>
                  {t('token_in')}{' '}
                  <b>
                    {(setting?.content?.in_token_amount * taux).toFixed(3)} {activeShop?.currency}
                  </b>
                  <br />
                  {t('token_out')}{' '}
                  <b>
                    {(setting?.content?.out_token_amount * taux).toFixed(3)} {activeShop?.currency}
                  </b>
                </Box>
              ) : (
                <>
                  <Skeleton variant='text' height={20} width={200} sx={{ fontSize: '1rem', mt: 1 }} />
                  <Skeleton variant='text' height={20} width={200} sx={{ fontSize: '1rem', mt: 1 }} />
                </>
              )}
            </Typography>
          </Alert>
        </Box>
        <Box display={'flex'}>
          <Button onClick={() => setOpen(true)} sx={{ mt: 3 }} size='small' variant='contained'>
            {t('add_credit')}
          </Button>
          <Button
            onClick={() => router.push('/app/billing/usage')}
            sx={{ mt: 3, ml: 5 }}
            color='inherit'
            size='small'
            variant='contained'
          >
            {t('view_usage')}
          </Button>
        </Box>
        <Payment
          location={location}
          open={open}
          setOpen={setOpen}
          taux={taux}
          setRefresh={setRefresh}
          refresh={refresh}
        />
      </Grid>
    </Grid>
  )
}

export default Plans
