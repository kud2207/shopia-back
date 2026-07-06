// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

// ** Icons Imports
import Reload from 'mdi-material-ui/Reload'
import { useTranslation } from 'react-i18next'
import { checkQrCodeScan, getCityById, getQrCode, updateShop } from 'src/@apiCore/npoints'
import { CircularProgress } from '@mui/material'
import { useGlobalContext } from 'src/@core/context/globalContext'
import QRCode  from 'react-qr-code'
import BotConfig from './BotConfig'
import { toast } from 'react-toastify'

const TabBot = () => {
  const [load, setLoad] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const { t } = useTranslation('shop')
  const { activeShop, setActiveShop, shops, setShops } = useGlobalContext()!
  const [cityData, setCityData] = useState<any>(null)

  let interval: any = null

  const handleGetCode = async () => {
    setLoad(true)
    await getQrCode(activeShop._id)
    interval = setInterval(async () => {
      const qrData = await checkQrCodeScan(activeShop._id)

      if (qrData.data.scanOk) {
        clearInterval(interval)
        const data = new FormData()
        data.append('isScan', '1')
        data.append('assistantId', activeShop?.assistantId || '')
        data.append('name', activeShop?.name)
        data.append(
          'addressFormat',
          `${activeShop?.address}${cityData?.name ? ', ' + cityData?.name : ''}${
            cityData?.ountry?.name ? ', ' + cityData?.country?.name : ''
          }`
        )

        updateShop(activeShop._id, data).then(response => {
          if (response.status == 200) {
            setActiveShop(response.data.shop)
            setShops(shops.filter((val: any) => val._id != activeShop._id).concat([response.data.shop]))
            localStorage.setItem('shops', JSON.stringify(shops.filter((val: any) => val._id != activeShop._id).concat([response.data.shop])))
            toast.success(t('scan_success'))
          }
          setLoad(false)
        })
      } else if (qrData.data.sessionSave) {
        setLoad(true)
      } else if (qrData.data.qrCode) {
        setQrCode(qrData.data.qrCode)
        setLoad(false)
      }
    }, 2000)
  }

  useEffect(() => {
    if (activeShop)
      getCityById(activeShop.city).then(res => {
        setCityData(res.data.data)
      })
  }, [activeShop])

  return (
    <>
      {!activeShop?.isScan ? (
        <CardContent sx={{ paddingBottom: 0 }}>
          <Box>
            <Typography variant='h6'>{t('add_bot_title')}</Typography>
            <Typography variant='body2'>{t('bot_text')}</Typography>
          </Box>
          <Grid container spacing={5} mt={5}>
            <Grid item xs={12} sm={7}>
              <Typography variant='body1'>
                <b>1.</b> {t('bot_step1')}
              </Typography>
              <Typography variant='body1' mt={2}>
                <b>2.</b> {t('bot_step2')}
              </Typography>
              <Typography variant='body1' mt={2}>
                <b>3.</b> <span dangerouslySetInnerHTML={{ __html: t('bot_step3') || "" }} />
              </Typography>
              <Typography variant='body1' mt={2}>
                <b>4.</b> <span dangerouslySetInnerHTML={{ __html: t('bot_step4') || "" }} />
              </Typography>
              <Typography variant='body1' mt={2}>
                <b>5.</b> {t('bot_step5')}
              </Typography>
            </Grid>

            <Grid
              item
              sm={5}
              xs={12}
              sx={{ display: 'flex', marginTop: [7.5, 2.5], alignItems: 'center', justifyContent: 'center' }}
            >
              {!load ? (
                <>
                  {qrCode ? (
                    <QRCode value={qrCode} size={220} />
                  ) : (
                    <Box
                      sx={{
                        background: "url('/images/qrcode.png')"
                      }}
                      onClick={handleGetCode}
                    >
                      <Box
                        width={250}
                        height={250}
                        sx={{
                          backdropFilter: 'blur(8px)',
                          display: 'flex',
                          pading: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Box
                          width={180}
                          height={180}
                          borderRadius={100}
                          sx={{
                            color: 'white',
                            backgroundColor: 'primary.main',
                            padding: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            textAlign: 'center'
                          }}
                        >
                          <Reload sx={{ fontSize: 40 }} />
                          {t('click_to_show')}
                        </Box>
                      </Box>
                    </Box>
                  )}
                </>
              ) : (
                <Box
                  width={250}
                  height={250}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <CircularProgress size={70} color='inherit' />
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      ) : (
        <BotConfig cityData={cityData} />
      )}
    </>
  )
}
export default TabBot
