// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import Avatar from '@mui/material/Avatar'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

// ** Icons Imports
import TrendingUp from 'mdi-material-ui/TrendingUp'
import CurrencyUsd from 'mdi-material-ui/CurrencyUsd'
import CurrencyEur from 'mdi-material-ui/CurrencyEur'

import CellphoneLink from 'mdi-material-ui/CellphoneLink'
import AccountOutline from 'mdi-material-ui/AccountOutline'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from 'src/@core/utils/format-currency'
import { Tooltip } from '@mui/material'
import { useGlobalContext } from 'src/@core/context/globalContext'

const renderStats = (data: any, role: string, currency: string, t: (key: string) => string) => {
  const { user } = useGlobalContext()

  const salesData =
    role == 'marchand' || role == 'admin'
      ? [
          {
            stats: data?.totalSales?.toString().padStart(2, '0'),
            title: t('sales'),
            color: 'primary',
            icon: <TrendingUp sx={{ fontSize: '1.75rem' }} />
          },
          {
            stats: data?.totalCustomers?.toString().padStart(2, '0'),
            title: t('customers'),
            color: 'success',
            icon: <AccountOutline sx={{ fontSize: '1.75rem' }} />
          },
          {
            stats: data?.totalProducts?.toString().padStart(2, '0'),
            color: 'warning',
            title: t('products'),
            icon: <CellphoneLink sx={{ fontSize: '1.75rem' }} />
          },
          {
            stats: formatCurrency(data?.totalRevenue, ' '),
            color: 'info',
            title: t('revenue'),
            icon: <CurrencyUsd sx={{ fontSize: '1.75rem' }} />,
            total: data?.totalRevenue
          }
        ]
      : role == 'livreur'
      ? [
          {
            stats: data?.totalSales?.toString().padStart(2, '0'),
            title: t('delivery'),
            color: 'primary',
            icon: <TrendingUp sx={{ fontSize: '1.75rem' }} />
          },
          {
            stats: data?.totalUndeliveryOrders?.toString().padStart(2, '0'),
            title: t('in_waiting'),
            color: 'primary',
            icon: <TrendingUp sx={{ fontSize: '1.75rem' }} />
          },
          {
            stats: formatCurrency(data?.totalRevenue, ' '),
            color: 'info',
            title: t('revenue'),
            icon: <CurrencyUsd sx={{ fontSize: '1.75rem' }} />,
            total: data?.totalRevenue
          }
        ]
      : role == 'partenaire'
      ? [
          {
            stats: data?.totalSales?.toString().padStart(2, '0') || 0,
            title: t('referral'),
            color: 'primary',
            icon: <TrendingUp sx={{ fontSize: '1.75rem' }} />
          },
          {
            stats: formatCurrency(data?.totalRevenue || 0, role == 'partenaire' ? 'USD' : currency),
            color: 'success',
            title: t('revenue'),
            icon: <CurrencyUsd sx={{ fontSize: '1.75rem' }} />
          },
          {
            stats: formatCurrency(user?.totalAmount || 0, currency),
            color: 'info',
            title: t('sold'),
            icon: <CurrencyEur sx={{ fontSize: '1.75rem' }} />
          }
        ]
      : []
console.log(salesData)
  return salesData?.map((item: any, index: number) => (
    <Grid item xs={12} sm={3} key={index}>
      <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
        <Avatar
          variant='rounded'
          sx={{
            mr: 3,
            width: 44,
            height: 44,
            boxShadow: 3,
            color: 'common.white',
            backgroundColor: `${item.color}.main`
          }}
        >
          {item.icon}
        </Avatar>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant='caption'>{item.title}</Typography>
          <Tooltip
            title={
              formatNumber(item.total || item.stats) +
              (item.total && currency ? ' ' + (role == 'partenaire' ? 'USD' : currency) : item.total ? ' FCFA' : '')
            }
            placement='top'
          >
            <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>{item.stats}</Typography>
          </Tooltip>
        </Box>
      </Box>
    </Grid>
  ))
}

interface EarningProps {
  data: Record<string, any>
  role: string
  currency: string
}

const StatisticsCard: React.FC<EarningProps> = ({ data, role, currency }) => {
  const { t } = useTranslation('dashboard')

  return (
    <Card>
      <CardHeader
        title={t('overall_title')}
        subheader={
          <Typography variant='body2'>
            <Box component='span' sx={{ fontWeight: 600, color: 'text.primary' }}>
              {t('overall_sub')}
            </Box>{' '}
            {role === 'livreur' ? t('delivery_person') : role === 'partenaire' ? t('partner') : t('marchand')}
          </Typography>
        }
        titleTypographyProps={{
          sx: {
            mb: 2.5,
            lineHeight: '2rem !important',
            letterSpacing: '0.15px !important'
          }
        }}
      />
      <CardContent sx={{ pt: theme => `${theme.spacing(3)} !important` }}>
        <Grid container spacing={[5, 0]}>
          {data && renderStats(data, role, role == 'partenaire' ? 'USD' : currency, t)}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default StatisticsCard
