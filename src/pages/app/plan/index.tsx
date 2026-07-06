// ** MUI Imports
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

// ** Demo Components Imports
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import moment from 'moment'
import { PricingTable, PricingSlot, PricingDetail } from 'react-pricing-table'
import 'moment/locale/fr'
import { convertCurrency, getGeoInfo, getPlans, updateAccount } from 'src/@apiCore/npoints'
import { Alert, AlertTitle, Box, CircularProgress } from '@mui/material'
import { useCookies } from 'react-cookie'
import Payment from 'src/views/account-settings/Payment'
import { formatNumber } from 'src/@core/utils/format-currency'

moment.locale('fr')

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common']))
    }
  }
}

const Plans = () => {
  const { t, i18n } = useTranslation('common')
  const { user, setUser, activeShop } = useGlobalContext()
  const [plans, setPlans] = useState<any[]>([])
  const [load, setLoad] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cookies, setCookie] = useCookies(['user'])
  const [open, setOpen] = useState(false)
  const [refresh, setRefresh] = useState(false)

  const [location, setLocation] = useState<any>(null)
  const [taux, setTaux] = useState<any>(1)
  const [item, setItem] = useState<any>(null)

  useEffect(() => {
    setLoad(true)
    if (!location)
      getGeoInfo().then(response => {
        setLocation(response.data)
      })
    getPlans()
      .then(response => {
        if (response.status == 200) setPlans(response.data.data)
      })
      .finally(() => setLoad(false))
  }, [location])

  const submit = (item: any) => {
    if (item.price && (!isSubscribe() || !user?.plan?.price)) {
      setItem(item)
      setOpen(true)
    } else if (!user.plan && !item.price) {
      const formValues = new FormData()
      const data = { ...user, plan: item, subscription_date: moment() }
      setUser(data)
      setCookie('user', JSON.stringify(data), {
        path: '/'
      })
      formValues.append('plan', item._id)
      formValues.append('subscription_date', moment().format('YYYY-MM-DD HH:m'))
      updateAccount(formValues)
    }
  }

  useEffect(() => {
    if (activeShop && activeShop.currency != 'USD') {
      convertCurrency('USD', activeShop.currency == 'FCFA' ? 'XAF' : activeShop.currency).then(val => {
        if (val) setTaux(val)
      })
    }
  }, [activeShop])

  const isSubscribe = () => {
    return moment(user?.subscription_date)
      .add(user?.plan?.duration || 0, user?.plan?.unit || 'months')
      .isAfter(moment())
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h5'>
          <Link href='#'>{t('pricing_plan')}</Link>
        </Typography>
        <Typography variant='body1'>{t('pricing_plan_text')}</Typography>
        {user?.plan && (
          <Box mt={4}>
            <Alert severity={isSubscribe() ? 'info' : 'error'} variant='outlined' sx={{ '& a': { fontWeight: 400 } }}>
              <AlertTitle>{t('plan_state')}</AlertTitle>
              {t('current_plan')} : {t(user?.plan?.title)} <br />
              {t('subscription_date')} : {moment(user?.subscription_date).format('LLL')} <br />
              {t('expiration_date')} :{' '}
              {moment(user?.subscription_date)
                .add(user?.plan?.duration || 0, user?.plan?.unit || 'months')
                .format('LLL')}
              <br />
              {!isSubscribe() && t('expiration_message')}
            </Alert>
          </Box>
        )}
      </Grid>
      <Grid item xs={12}>
        {load && (
          <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
            <CircularProgress size={40} color='inherit' />
          </Box>
        )}
        {!load && (
          <PricingTable highlightColor='#048DD6' buttonClass='btn-rounded'>
            {plans.map((item: any) => (
              <PricingSlot
                key={item._id}
                onClick={() => submit(item)}
                buttonText={user?.plan?._id == item._id ? t('current_plan') : !item.price ? t('used') : t('subscribe')}
                title={t(item.title)}
                priceText={`${formatNumber((item.price * taux).toFixed(1))} ${activeShop?.currency}${
                  item.title != 'FREE' ? ' / ' + ((item.duration > 1 ? item.duration + ' ' : '') + t(item.unit)) : ''
                }`}
                highlighted={item.color != ''}
              >
                {item?.content[i18n?.language]?.avantages?.map((val: any, index: number) => (
                  <PricingDetail key={index}>{val}</PricingDetail>
                ))}
                <PricingDetail key={'credit' + item._id}>
                  {formatNumber((item.credit * taux).toFixed(0))} {activeShop?.currency} {t('ia_credit')}
                  {item.title != 'FREE' ? ' / ' + ((item.duration > 1 ? item.duration + ' ' : '') + t(item.unit)) : ''}
                </PricingDetail>
              </PricingSlot>
            ))}
          </PricingTable>
        )}
      </Grid>
      {item && (
        <Payment
          location={location}
          open={open}
          setOpen={setOpen}
          taux={taux}
          setRefresh={setRefresh}
          refresh={refresh}
          item={item}
        />
      )}
    </Grid>
  )
}

export default Plans
