// ** MUI Imports
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { ApexOptions } from 'apexcharts'

// ** Demo Components Imports
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import moment from 'moment'
import 'moment/locale/fr'
import { convertCurrency, getGeoInfo, getSetting, getUsageData, getUserById } from 'src/@apiCore/npoints'
import { Alert, Box, Button, Card, CardContent, Skeleton } from '@mui/material'
import Payment from 'src/views/account-settings/Payment'
import { formatCurrency, formatNumber } from 'src/@core/utils/format-currency'
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import { useTheme } from '@mui/material/styles'
import ChevronLeft from 'mdi-material-ui/ChevronLeft'
import ChevronRight from 'mdi-material-ui/ChevronRight'
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'

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
  const [data, setData] = useState<any[]>([])
  const [taux, setTaux] = useState<any>(1)
  const [date, setDate] = useState(new Date())
  const theme = useTheme()

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 9,
        distributed: true,
        columnWidth: '20px',
        // endingShape: 'rounded',
        startingShape: 'rounded'
      }
    },
    stroke: {
      width: 2,
      colors: [theme.palette.background.paper]
    },
    legend: { show: false },
    grid: {
      strokeDashArray: 7,
      padding: {
        top: -1,
        right: 0,
        left: 3,
        bottom: 2
      }
    },
    dataLabels: { enabled: false },
    colors: [
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main
    ],
    states: {
      hover: {
        filter: { type: 'none' }
      },
      active: {
        filter: { type: 'none' }
      }
    },
    xaxis: {
      categories: [],
      tickPlacement: 'on',
        labels: { show: true, formatter: value => moment(value).format("LL") },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      show: true,
      tickAmount: 4,
      labels: {
        offsetX: -12,
        formatter: value => `${formatNumber(value?.toFixed(3))} ${activeShop?.currency}`
      }
    }
  }
  useEffect(() => {
    setLoad(true)
    if (user && date)
      getUsageData(user?._id, date)
        .then(response => {
          console.log(response.data.data)
          if (response.status == 200) setData(response.data.data)
        })
        .finally(() => setLoad(false))
  }, [user, date])

  useEffect(() => {
    if (activeShop && activeShop.currency != 'USD') {
      convertCurrency('USD', activeShop.currency == 'FCFA' ? 'XAF' : activeShop.currency).then(val => setTaux(val))
    }
  }, [activeShop])

  const isCurrentMonth = () => {
    const currentDate = new Date()
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
  }

  const handlePrevMonth = () => {
    const newDate = new Date(date)
    newDate.setMonth(newDate.getMonth() - 1)
    setDate(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(date)
    newDate.setMonth(newDate.getMonth() + 1)
    setDate(newDate)
  }

  return (
    <ApexChartWrapper>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
            <Typography variant='h5'>{t('usage')}</Typography>
            <Typography display={'flex'} alignItems={'center'}>
              <ChevronLeft onClick={handlePrevMonth} className='cursor-pointer' />
              <Typography ml={1}>{moment(date).format('MMMM YYYY')}</Typography>
              {!isCurrentMonth() && <ChevronRight onClick={handleNextMonth} className='cursor-pointer' />}
            </Typography>
          </Box>
          <Typography variant='body2' mb={2}>{t('usage_text')+moment(date).format('MMMM YYYY')}</Typography>
          <ReactApexcharts
            type='bar'
            height={355}
            options={{ ...options, xaxis: { ...options.xaxis, categories: data.map(item => item.date) } }}
            series={[{ data: data.map(item => item.totalAmount*taux), name: t('usage') }]}
          />
        </Grid>
      </Grid>
    </ApexChartWrapper>
  )
}

export default Plans
