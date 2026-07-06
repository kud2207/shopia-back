// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import ImageIcon from '@mui/icons-material/Image'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from 'src/@core/utils/format-currency'
import { Tooltip } from '@mui/material'

interface EarningProps {
  data: Record<string, any>
  currency: string
}

const TotalEarning: React.FC<EarningProps> = ({ data, currency }) => {
  const { t, i18n } = useTranslation('dashboard')

  return (
    <Card>
      <CardHeader
        title={t('total_earning_title')}
        titleTypographyProps={{ sx: { lineHeight: '1.6 !important', letterSpacing: '0.15px !important' } }}
      />
      <CardContent sx={{ pt: theme => `${theme.spacing(2.25)} !important` }}>
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center' }}>
          <Tooltip title={formatNumber(data?.totalMonthlyRevenue) + ' ' + (currency)} placement='top'>
            <Typography variant='h4' sx={{ fontWeight: 600, fontSize: '2.125rem !important' }}>
              {formatCurrency(data?.totalMonthlyRevenue, currency)}
            </Typography>
          </Tooltip>
        </Box>

        <Typography component='p' variant='caption' sx={{ mb: 10 }}>
          {t('compared')} {formatNumber(data?.totalPreviousMonthRevenue) + ' ' + (currency)} {t('last_month')}
        </Typography>

        {data &&
          data?.topProducts?.map((item: any, index: number) => {
            if (item?.product.name)
              return (
                <Box
                  key={item?.product._id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    ...(index !== data.length - 1 ? { mb: 8.5 } : {})
                  }}
                >
                  <Avatar
                    variant='rounded'
                    src={item.product?.image?.length > 0 ? item.product?.image[0] : ''}
                    sx={{
                      mr: 3,
                      width: 40,
                      height: 40,
                      backgroundColor: theme => `rgba(${theme.palette.customColors.main}, 0.04)`
                    }}
                  >
                    <ImageIcon />
                  </Avatar>
                  <Box
                    sx={{
                      width: '100%',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box sx={{ marginRight: 2, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant='body2' sx={{ mb: 0.5, fontWeight: 600, color: 'text.primary' }}>
                        {item?.product.name}
                      </Typography>
                      <Typography variant='caption'>
                        {item.product?.category?.icon}{' '}
                        {item.product?.category ? item.product?.category[i18n.language] : ''}
                      </Typography>
                    </Box>

                    <Box sx={{ minWidth: 85, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant='body2' sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                        {item?.revenue && formatCurrency(item?.revenue, currency)}
                      </Typography>
                      <LinearProgress
                        color={item.color}
                        value={(item?.revenue / data?.totalMonthlyRevenue) * 100}
                        variant='determinate'
                      />
                    </Box>
                  </Box>
                </Box>
              )
          })}
      </CardContent>
    </Card>
  )
}

export default TotalEarning
