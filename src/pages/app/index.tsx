// ** MUI Imports
import React, { useEffect, useState } from 'react'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TableRow from '@mui/material/TableRow'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'

import { Avatar, Box, Button, Chip, CircularProgress, Table, Tooltip } from '@mui/material'

// ** Icons Imports
import Poll from 'mdi-material-ui/Poll'
import TruckDelivery from 'mdi-material-ui/TruckDelivery'
import HelpCircleOutline from 'mdi-material-ui/HelpCircleOutline'
import Cancel from 'mdi-material-ui/Cancel'

// ** Custom Components Imports
import CardStatisticsVerticalComponent from 'src/@core/components/card-statistics/card-stats-vertical'

// ** Styled Component Import
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'

// ** Demo Components Import
import Trophy from 'src/views/dashboard/Trophy'
import TotalEarning from 'src/views/dashboard/TotalEarning'
import StatisticsCard from 'src/views/dashboard/StatisticsCard'
import WeeklyOverview from 'src/views/dashboard/WeeklyOverview'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import {
  countOrderStatus,
  getAllStats,
  getAllStatsDelivery,
  getDeliveredOrders,
  getOrders,
  getPartnerStats,
  getSetting
} from 'src/@apiCore/npoints'
import { useGlobalContext } from 'src/@core/context/globalContext'
import moment from 'moment'
import 'moment/locale/fr'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { useSettings } from 'src/@core/hooks/useSettings'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common', 'dashboard']))
    }
  }
}

interface Column {
  id: 'ID' | 'product' | 'customer' | 'status' | 'date' | 'action'
  label: string
  minWidth?: number
  align?: 'right'
  format?: (value: number) => string
  sort?: boolean
}

const columns: readonly Column[] = [
  { id: 'ID', label: 'Order' },
  {
    id: 'customer',
    label: 'Customer',
    align: 'right',
    format: (value: number) => value.toLocaleString('en-US')
  },
  {
    id: 'date',
    label: 'Date',
    align: 'right',
    format: (value: number) => value.toFixed(2),
    sort: true
  },
  {
    id: 'status',
    label: 'status',
    align: 'right',
    sort: true
  }
]

interface Order {
  _id: string
  order_id: number
  customer: {
    name: string
    email: string
    image: string
    phone: string
  }
  date: string
  status: string
  deliveryService: string
}

interface Data {
  monthlyStats: Record<string, any>
  stats: Record<string, any>
  totalEarnings: Record<string, any>
  weeklyStats: Record<string, any>
}
const Dashboard = () => {
  const { user, activeShop } = useGlobalContext()
  const [orders, setOrders] = useState<Order[]>([])
  const { t, i18n } = useTranslation('dashboard')
  const router = useRouter()
  const [data, setData] = useState<Data>({
    monthlyStats: {},
    stats: {},
    totalEarnings: {},
    weeklyStats: {}
  })
  const [loading, setLoading] = useState(true)
  const [load, setLoad] = useState(true)
  const [orderStatus, setOrderStatus] = useState<any[]>([])
  const [copy, setCopy] = useState(false)
  const [setting, setSetting] = useState<any>(null)

  const { settings } = useSettings()
  React.useEffect(() => {
    if (user && (user?.role === 'marchand' || user?.role === 'admin') && activeShop) {
      setLoading(true)
      getAllStats(`?userId=${user._id}&activeShop=${activeShop._id}`)
        .then(resp => {
          setLoading(false)
          setData(resp.data)
        })
        .catch(err => console.log(err))

      countOrderStatus(activeShop?._id).then(response => {
        setOrderStatus(response.data.data)
      })
    }
  }, [user])

  useEffect(() => {
    if (user && user?.role === 'livreur') {
      setLoading(true)
      getAllStatsDelivery(`?userId=${user._id}`)
        .then(resp => {
          setLoading(false)
          setData(resp.data)
        })
        .catch(err => console.log(err))
    }
  }, [user, activeShop])

  useEffect(() => {
    if (user && (user?.role === 'marchand' || user?.role === 'admin') && activeShop?._id) {
      setLoad(true)
      const query = `?&page=1&sortOrder=desc&limit=5&sortBy=date`
      getOrders(activeShop?._id, query)
        .then(resp => {
          setOrders(resp.data?.data?.slice(0, 5) || [])
          setLoad(false)
        })
        .finally(() => setLoad(false))
    }
  }, [activeShop, user])

  useEffect(() => {
    if (user && user?.role === 'livreur') {
      setLoad(true)
      const query = `?userId=${user?._id}&page=1&sortOrder=desc&limit=5&sortBy=date`
      getDeliveredOrders(query)
        .then(resp => {
          setOrders(resp.data.data)
          setLoad(false)
        })
        .finally(() => setLoad(false))
    }
  }, [user])

  useEffect(() => {
    if (user && user?.role === 'partenaire') {
      setLoading(true)
      getPartnerStats(user._id)
        .then(resp => {
          setLoading(false)
          setData(resp.data)
        })
        .finally(() => setLoading(false))
      getSetting()
        .then(resp => {
          setSetting(user?.settings || resp.data?.data?.content)
        })
        .finally(() => setLoading(false))
    }
  }, [user])

  const countOrdersByStatus = (status: string): string => {
    return orderStatus.find(item => item._id == status)?.count || 0
  }

  const getStatusColor = (status: any) => {
    switch (status) {
      case 'processing':
        return 'warning'
      case 'shipped':
        return 'success'
      case 'delivered':
        return 'success'
      case 'returned':
        return 'secondary'
      case 'refunded':
        return 'primary'
      case 'cancelled':
        return 'error'
      case 'sent_to_delivry':
        return 'info'
      default:
        return 'warning'
    }
  }

  const handleView = (item: any) => {
    router.push('/app/orders/' + item._id)
  }
  const copyContent = async val => {
    try {
      await navigator.clipboard?.writeText(val)
      setCopy(true)
      setTimeout(() => setCopy(false), 3000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <ApexChartWrapper>
      {loading ? (
        <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
          <CircularProgress size={40} color='inherit' />
        </Box>
      ) : (
        <Grid container spacing={6}>
          <Grid item xs={12} md={4}>
            <Trophy role={user?.role} currency={activeShop?.currency} data={data.monthlyStats} />
          </Grid>
          <Grid item xs={12} md={8}>
            <StatisticsCard currency={activeShop?.currency} role={user?.role} data={data.stats} />
          </Grid>
          {user?.role === 'partenaire' && (
            <Grid item xs={12}>
              <Paper sx={{ padding: 5 }}>
                <Box>
                  <Typography variant='h5'>{t('afiliate_link')}</Typography>
                  <Typography variant='body1' sx={{fontWeight: "700"}} mt={4}>
                    {t('win')} {setting?.commission_type == 'percent' ? setting?.commission + '%' : '$' + setting?.commission}{' '}
                    {t('to_any') + ' ' + setting?.commission_duration +" "+ t('months')}
                  </Typography>
                  <Typography variant='body2' mt={2}>{t('afiliate_text')}</Typography>

                  <a href='#'>www.shopia-app.com/register?ref={user?._id}</a>
                </Box>
                <Button
                  variant='contained'
                  color={copy ? 'success' : 'info'}
                  onClick={() => copyContent(`https://shopia-app.com/register?ref=${user?._id}&u=marchand`)}
                >
                  {t(copy ? 'copied' : 'copy')}
                </Button>
              </Paper>
            </Grid>
          )}
          <Grid item xs={12} md={user?.role === 'partenaire' ? 12 : 6} lg={user?.role === 'partenaire' ? 12 : 4}>
            <WeeklyOverview currency={activeShop?.currency} data={data.weeklyStats} role={user?.role || ''} />
          </Grid>

          {(user?.role === 'marchand' || user?.role === 'admin') && (
            <Grid item xs={12} md={6} lg={4}>
              <TotalEarning currency={activeShop?.currency} data={data.totalEarnings} />
            </Grid>
          )}
          {(user?.role === 'marchand' || user?.role === 'admin') && (
            <Grid item xs={12} md={6} lg={4}>
              {load ? (
                <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                  <CircularProgress size={40} color='inherit' />
                </Box>
              ) : (
                <Grid container spacing={6}>
                  <Grid item xs={6}>
                    <CardStatisticsVerticalComponent
                      stats={`${countOrdersByStatus('processing')}`}
                      color='warning'
                      trendNumber=''
                      subtitle=''
                      title={t('pending_order')}
                      icon={<HelpCircleOutline />}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <CardStatisticsVerticalComponent
                      stats={`${countOrdersByStatus('sent_to_delivry')}`}
                      title={t('sent_to_deliver')}
                      color='secondary'
                      trendNumber=''
                      subtitle=''
                      icon={<TruckDelivery />}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <CardStatisticsVerticalComponent
                      stats={`${countOrdersByStatus('delivered')}`}
                      icon={<Poll />}
                      color='success'
                      title={t('completed_order')}
                      subtitle=''
                      trendNumber=''
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <CardStatisticsVerticalComponent
                      stats={`${countOrdersByStatus('cancelled')}`}
                      trendNumber=''
                      title={t('failed_order')}
                      subtitle=''
                      icon={<Cancel />}
                    />
                  </Grid>
                </Grid>
              )}
            </Grid>
          )}

          {user?.role !== 'partenaire' && (
            <Grid item xs={12} md={user?.role === 'livreur' ? 6 : 12} lg={user?.role === 'livreur' ? 8 : 12}>
              <Card className={'responsiveTable-' + settings?.mode}>
                <Paper sx={{ width: '100%', overflow: 'hidden' }} className={'responsiveTable-' + settings?.mode}>
                  <TableContainer sx={{}}>
                    <Table stickyHeader aria-label='sticky table'>
                      <TableHead>
                        <TableRow>
                          {columns.map(column => (
                            <TableCell key={column.id} sx={{ flexDirection: 'row' }}>
                              <Grid container alignItems='center' justifyContent={'center'}>
                                <Grid item>{t(`${column.id}`)}</Grid>
                              </Grid>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      {load && (
                        <TableRow>
                          <TableCell colSpan={columns.length} align='center'>
                            {' '}
                            <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                              <CircularProgress size={40} color='inherit' />
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                      {!load && (
                        <TableBody>
                          {orders?.map((row, index) => {
                            return (
                              <TableRow hover tabIndex={-1} key={row._id}>
                                <TableCell align={'center'} data-label={t('ID')} onClick={() => handleView(row)}>
                                  <span style={{ color: 'blue', cursor: 'pointer' }}>#{row.order_id || index + 1}</span>
                                </TableCell>
                                <TableCell align={'center'} data-label={t('customer')}>
                                  <Box display='flex' justifyContent={'left'} className='justify-sm-right'>
                                    <Avatar src={row.customer?.image}>{row.customer?.name?.slice(0, 1)}</Avatar>
                                    <Box marginLeft={2}>
                                      <Typography fontSize={14} align='left'>
                                        {row.customer?.name}
                                      </Typography>
                                      <Typography fontSize={11} align='left'>
                                        {row.customer?.email || row.customer?.phone}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell align={'center'} data-label={t('date')}>
                                  <Tooltip placement='top' title={moment(row?.date).format('LLL')}>
                                    <Box>{moment(row?.date).format('LL')}</Box>
                                  </Tooltip>
                                </TableCell>
                                <TableCell align={'center'} data-label={t('status')}>
                                  <Chip
                                    label={t(
                                      `${
                                        user?.role === 'livreur' && row?.status == 'sent_to_delivry'
                                          ? 'processing'
                                          : row?.status
                                      }_`
                                    )}
                                    color={getStatusColor(
                                      user?.role === 'livreur' && row?.status == 'sent_to_delivry'
                                        ? 'processing'
                                        : row?.status
                                    )}
                                    sx={{
                                      height: 24,
                                      fontSize: '0.75rem',
                                      textTransform: 'capitalize',
                                      '& .MuiChip-label': { fontWeight: 500 }
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      )}
                    </Table>
                  </TableContainer>
                </Paper>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </ApexChartWrapper>
  )
}

export default Dashboard
