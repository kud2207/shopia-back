// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputLabel from '@mui/material/InputLabel'
import CardContent from '@mui/material/CardContent'

// ** Third Party Imports
import { registerLocale } from 'react-datepicker'

// ** Styled Components
import { Box, Card, CircularProgress, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import fr from 'date-fns/locale/es'
import { createZone, getZoneById, updateZone } from 'src/@apiCore/npoints'
import { toast } from 'react-toastify'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import CountryAndCity from 'src/views/shop-settings/CountryAndCity'
import { TagsInput } from 'react-tag-input-component'

registerLocale('fr', fr)

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['zone', 'common']))
    }
  }
}

const CreateZone = () => {
  // ** State
  const [load, setLoad] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [product, setProduct] = useState<any>(null)
  const { t } = useTranslation('zone')
  const router = useRouter()
  const { id }: any = router.query
  const [load1, setLoad1] = useState(id !== undefined)
  const [zones, setZones] = useState<any[]>([])

  const handleSubmit = async (event: any) => {
    event.preventDefault()
    const data = new FormData(event.target)
    data.append('description', zones?.toString())
    setLoad(true)
    createZone(data)
      .then(response => {
        if (response.status == 201) {
          toast.success(t('success'))
          router.back()
        } else toast.error(t('error'))
      })
      .catch(() => toast.error(t('error')))
      .finally(() => setLoad(false))
  }

  const handleUpdate = async (event: any) => {
    event.preventDefault()
    const data = new FormData(event.target)
    setLoad(true)
    data.append('description', zones?.toString())

    updateZone(id, data)
      .then(response => {
        if (response.status == 200) {
          toast.success(t('updated'))
          router.back()
        } else toast.error(t('error_update'))
      })
      .catch(() => toast.error(t('error_update')))
      .finally(() => setLoad(false))
  }

  useEffect(() => {
    if (id) {
      setLoad1(true)
      getZoneById(id)
        .then(response => {
          if (response.status == 200) {
            const data = response.data.data
            if (data) {
              setName(data.title)
              setZones(data?.description?.split(','))
              setProduct(data)
            }
          }
        })
        .finally(() => setLoad1(false))
    }
  }, [id])

  if (load1)
    return (
      <Grid item xs={12} sx={{ mt: 20 }} display={'flex'} justifyContent={'center'}>
        <CircularProgress size={50} sx={{ ml: 5 }} color='inherit' />
      </Grid>
    )

  return (
    <CardContent sx={{ p: 0 }}>
      <form onSubmit={id ? handleUpdate : handleSubmit}>
        <Box>
          <Typography variant='h4'>{t(id ? 'update' : 'add_title')}</Typography>
          <Typography variant='body2'>{t('add_title_text')}</Typography>
        </Box>
        <Grid container spacing={7} mt={4}>
          <Grid item xs={12} sm={12}>
            <Card>
              <CardContent>
                <Grid>
                  <InputLabel sx={{ mb: 3 }}>{t('zone_title')}</InputLabel>
                  <TextField
                    required
                    fullWidth
                    type='text'
                    name='title'
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </Grid>
                <Grid container spacing={7} mt={5}>
                  <CountryAndCity sm={6} defaultCountry={product?.country} defaultCity={product?.city} />
                </Grid>
                <Grid mt={5}>
                  <Grid item xs={12} sx={{ mb: 3 }} display={'flex'} justifyContent={'space-between'}>
                    <InputLabel>{t('quarter')}</InputLabel>
                  </Grid>
                  <TagsInput
                    value={zones}
                    onChange={setZones}
                    name='zones'
                    placeHolder={t('description_placeholder') + ''}
                    separators={['Enter', ',']}
                  />
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Button variant='contained' disabled={load} type='submit' sx={{ marginRight: 3.5 }}>
              {t(id ? 'update' : 'add')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
          </Grid>
        </Grid>
      </form>
    </CardContent>
  )
}

export default CreateZone
