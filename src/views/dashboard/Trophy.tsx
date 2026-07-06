// ** MUI Imports
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { styled, useTheme } from '@mui/material/styles'
import { MenuDown, MenuUp } from 'mdi-material-ui'
import { Box, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { formatCurrency, formatNumber } from 'src/@core/utils/format-currency'

// Styled component for the triangle shaped background image
const TriangleImg = styled('img')({
  right: 0,
  bottom: 0,
  height: 170,
  position: 'absolute'
})

// Styled component for the trophy image
const TrophyImg = styled('img')({
  right: 15,
  bottom: 15,
  height: 59,
  position: 'absolute'
})

interface EarningProps {
  data: Record<string, any>
  currency: string
  role: string
}

const Trophy: React.FC<EarningProps> = ({ data, currency, role }) => {
  // ** Hook
  const theme = useTheme()
  const { t } = useTranslation('dashboard')
  const router = useRouter()

  const imageSrc = theme.palette.mode === 'light' ? 'triangle-light.png' : 'triangle-dark.png'

  const handleView = () => {
    if (role === 'livreur') {
      router.push('/app/delivery_orders')
    } else if(role === 'marchand') {
      router.push('/app/orders')
    } else if(role === 'partenaire') {
      router.push('/app/payment')
    }
  }

  function calculatePercentageDifference(newValue: number, oldValue: number) {
    if (oldValue === 0) {
      if (newValue === 0) {
        return 0
      } else {
        return '100'
      }
    } else if (newValue === 0) return '100'

    return Math.abs(((newValue - oldValue) / oldValue) * 100).toFixed(1)
  }

  return (
    <Card sx={{ position: 'relative' }}>
      <CardContent>
        <Typography variant='h6'>{t('monthly_revenue_title')} 🥳</Typography>
        <Typography variant='body2' sx={{ letterSpacing: '0.25px' }}>
          {t('monthly_revenue_sub')}
        </Typography>
        <Box display={'flex'}>
          <Tooltip title={formatNumber(data?.currentRevenue) + ' ' + (role=="partenaire"?"USD":currency||"")} placement='top'>
            <Typography variant='h5' sx={{ my: 4, color: 'primary.main' }}>
              {formatCurrency(data?.currentRevenue, role=="partenaire"?"USD":currency)}
            </Typography>
          </Tooltip>

          {role !== 'partenaire' && (
            <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 999 }}>
              {data?.currentRevenue >= data?.lastMonthRevenue ? (
                <MenuUp sx={{ fontSize: '1.875rem', verticalAlign: 'middle', color: 'success.main' }} />
              ) : (
                <MenuDown sx={{ fontSize: '1.875rem', verticalAlign: 'middle', color: 'red' }} />
              )}
              <Tooltip
                title={
                  <Typography variant='body2' color={'white'}>
                    {t('current_month')}: {formatNumber(data?.currentRevenue) + ' ' + (currency || 'XAF')} <br />{' '}
                    {t('last_month')}: {formatNumber(data?.lastMonthRevenue) + ' ' + (currency || 'XAF')}
                  </Typography>
                }
                color='black'
                placement='top'
              >
                <Typography
                  variant='body2'
                  sx={{
                    fontWeight: 600,
                    color: data?.currentRevenue >= data?.lastMonthRevenue ? 'success.main' : 'red'
                  }}
                >
                  {calculatePercentageDifference(data?.currentRevenue, data?.lastMonthRevenue)}%
                </Typography>
              </Tooltip>
            </Box>
          )}
        </Box>
        <Button onClick={handleView} size='small' variant='contained'>
          {t(role === 'livreur' ? 'my_delivery' : role === 'partenaire' ? 'withdraw' : 'view_sale')}
        </Button>
        <TriangleImg alt='triangle background' src={`/images/misc/${imageSrc}`} />
        <TrophyImg alt='trophy' src='/images/misc/trophy.png' />
      </CardContent>
    </Card>
  )
}

export default Trophy
