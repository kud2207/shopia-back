// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import { useTheme } from '@mui/material/styles'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

// ** Third Party Imports
import { ApexOptions } from 'apexcharts'

// ** Custom Components Imports
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from 'src/@core/utils/format-currency'

interface EarningProps {
  data: Record<string, any>
  currency: StringConstructor
  role: string
}

const WeeklyOverview: React.FC<EarningProps> = ({ data, currency, role }) => {
  // ** Hook
  const theme = useTheme()
  const { t } = useTranslation('dashboard')
  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 9,
        distributed: true,
        columnWidth: role === 'partenaire'?'20px':'50px',
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
        left: -12,
        bottom: 5
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
      categories:
        role === 'partenaire'
          ? [
              t('Jan'),
              t('Feb'),
              t('Mar'),
              t('Apr'),
              t('May'),
              t('Jun'),
              t('Jul'),
              t('Aug'),
              t('Sep'),
              t('Oct'),
              t('Nov'),
              t('Dec')
            ]
          : [t('Sun'), t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat')],
      tickPlacement: 'on',
      labels: { show: true, formatter: value => value?.slice(0, 3) },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      show: true,
      tickAmount: 4,
      labels: {
        offsetX: -12,
        formatter: value => `${formatCurrency(value, role=="partenaire"?"USD":currency)}`
      }
    },
    tooltip: {
      followCursor: true,
      fixed: {
        enabled: true,
        position: 'topCenter'
      }
    }
  }

  function getObjectValuesAsArray<T>(obj: Record<string, T>): T[] {
    return Object.values(obj)
  }

  return (
    <Card>
      <CardHeader
        title={role === 'partenaire' ? t('yearly_title') : t('weekly_title')}
        titleTypographyProps={{
          sx: { lineHeight: '2rem !important', letterSpacing: '0.15px !important' }
        }}
      />
      <CardContent sx={{ '& .apexcharts-xcrosshairs.apexcharts-active': { opacity: 0 } }}>
        {data?.weeklyRevenue && (
          <ReactApexcharts
            type='bar'
            height={205}
            options={options}
            series={[{ data: getObjectValuesAsArray(data?.weeklyRevenue), name: 'Revenue' }]}
          />
        )}
        <Box sx={{ mb: 7, display: 'flex', alignItems: 'center' }}>
          <Typography variant='h6' sx={{ mr: 4 }}>
            {data?.totalWeeklyRevenue &&
              formatCurrency(data?.totalWeeklyRevenue, role =='partenaire' ? 'USD' : currency)}
          </Typography>
          <Typography variant='body2'>
            {t('weekly_text_1')} {formatNumber(data?.totalWeeklyRevenue)} {role == 'partenaire' ? 'USD' : currency} 😎{' '}
            {role === 'partenaire' ? t('yearly_text_2') : t('weekily_text_2')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default WeeklyOverview
