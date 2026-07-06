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
import { checkQrCodeScan, getQrCode } from 'src/@apiCore/npoints'
import { Box } from '@mui/material'
import CircularProgress from '@mui/material/CircularProgress'
import type { CircularProgressProps } from '@mui/material/CircularProgress'

moment.locale('fr')

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common']))
    }
  }
}

const Progress = (props: CircularProgressProps) => {
  return (
    <Box display={'flex'} justifyContent={'center'} flexDirection={'column'}>
      <CircularProgress variant='determinate' {...props} size={100} />
      <Box>
        <Typography variant='h4' component='div' style={{ marginLeft: '13px' }} color='text.primary'>
          {`${Math.round((props.value || 0) as number)}%`}
        </Typography>
      </Box>
    </Box>
  )
}

const Scans = () => {
  const { t } = useTranslation('common')
  const { user, shops } = useGlobalContext()
  const [setting, setSetting] = useState<any>(null)
  const [load, setLoad] = useState(true)
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  let interval: any = null

  const handleGetCode = async (shop: any) => {
    setLoad(true)
    if (shop && shop.isScan) {
      await getQrCode(shop._id)
      setTimeout(async () => {
        // const qrData = await checkQrCodeScan(shop._id)
        // if (qrData.data.scanOk || qrData.data.qrCode) {
        //   clearInterval(interval)
        //   interval = null

        // }
        setProgress(progress + 1)
      }, 1200)
    } else setProgress(progress + 1)
  }

  useEffect(() => {
    if (shops && progress < shops.filter(v=>v.isScan).length) handleGetCode(shops.filter(v=>v.isScan)[progress])
    else setLoad(false)
  }, [shops, progress])
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h5'>Scan shop</Typography>

        <Box mt={4} display={'flex'} justifyContent={'center'}>
          {shops.length && <Progress value={((progress + 1) * 100) / shops.filter(v=>v.isScan).length} />}{' '}
        </Box>
        <Box mt={4} display={'flex'} justifyContent={'center'}>
          <Typography variant='h6'>{progress+1} / { shops.filter(v=>v.isScan).length}</Typography>
          {load && <CircularProgress />} {!load && <Typography variant='h2'>Scan terminé</Typography>}
        </Box>
      </Grid>
    </Grid>
  )
}

export default Scans
