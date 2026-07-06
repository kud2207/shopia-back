// ** React Imports
import { ReactNode, useState } from 'react'

// ** MUI Components
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { styled } from '@mui/material/styles'
import MuiCard, { CardProps } from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'

// ** Configs
import themeConfig from 'src/configs/themeConfig'

// ** Layout Import
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** Demo Imports
import FooterIllustrationsV1 from 'src/views/pages/auth/FooterIllustration'

import { useTranslation } from 'next-i18next'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { registerShop } from 'src/@apiCore/npoints'
import { useGlobalContext } from 'src/@core/context/globalContext'
import Alert from '@mui/material/Alert'
import { useRouter } from 'next/router'
import isAuth from 'src/middleware/frontAuth'

//import Alert from '@mui/material/Alert'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common']))
    }
  }
}

// ** Styled Components
const Card = styled(MuiCard)<CardProps>(({ theme }) => ({
  [theme.breakpoints.up('sm')]: { width: '28rem' }
}))

const defaultHandler = () => {
  return
}

const CreateShop = ({
  isAuthenticate = false,
  handleActionCompleted = defaultHandler
}: {
  isAuthenticate: boolean
  handleActionCompleted: any
}) => {
  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const [serverMsg, setServerMsg] = useState('')
  const { t } = useTranslation('common')
  const router = useRouter()
  const { user, shops, setShops, setActiveShop } = useGlobalContext()

  const handleSubmitForm = (event: any) => {
    event.preventDefault()
    if (shops.length >= (user?.plan?.shops || 1)) {
      setIsError(true)
      setLoading(false)
      setServerMsg('upgrade_plan')
      return
    }
    setIsError(false)
    setIsSuccess(false)
    setServerMsg('')
    try {
      const name = event.target.elements['name'].value
      const description = event.target.elements['description'].value
      setLoading(true)
      if (user && name) {
        registerShop({ name, description, user: user?._id })
          .then(data => {
            setLoading(false)
            setIsError(data.status != 200)
            setIsSuccess(data.status == 200)
            setServerMsg(data.data.message)
            if (data.status == 200) {
              setShops(shops.concat(data.data.data))
              setActiveShop(data.data.data)
              handleActionCompleted()
              localStorage.setItem('shops', JSON.stringify(shops.concat(data.data.data)))
              router.push(isAuthenticate ? '/app/shop-settings/' : '/app')
            }
          })
          .catch(err => {
            setIsError(true)
            setServerMsg(err.message)
            setLoading(false)
          })
      } else {
        setIsError(true)
        setLoading(false)
        setServerMsg('error_on_filling_field_on_client_side')
      }
      setIsError(true)
    } catch (error: any) {
      setIsError(true)
      setServerMsg(error.message)
    }
  }

  return (
    <Box className='content-center'>
      <Card sx={{ zIndex: 1 }}>
        <CardContent sx={{ padding: theme => `${theme.spacing(12, 9, 7)} !important` }}>
          {!isAuthenticate && (
            <>
              <Box sx={{ mb: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src='/images/logos/logo-dark.png' alt='S' width={50} height={50} />
                <Typography
                  variant='h6'
                  sx={{
                    ml: 2,
                    lineHeight: 1,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '1.5rem !important'
                  }}
                >
                  {themeConfig.templateName}
                </Typography>
              </Box>

              <Box sx={{ mb: 6 }}>
                <Typography variant='h5' sx={{ fontWeight: 600, marginBottom: 1.5 }}>
                  {t('welcometo')} {themeConfig.templateName}! 👋🏻
                </Typography>
                <Typography variant='body2'>
                  {t('create_shop_instruction')} {themeConfig.templateName}
                </Typography>
              </Box>
            </>
          )}
          {isAuthenticate && (
            <Box sx={{ mb: 4 }}>
              <Typography variant='h5' sx={{ fontWeight: 600, marginBottom: 1.5 }}>
                {t('add_new_shop')}
              </Typography>
            </Box>
          )}
          <form autoComplete='off' onSubmit={handleSubmitForm}>
            <TextField
              autoFocus
              fullWidth
              id='name'
              name='name'
              label={t('shop_name_placeholder_instruction')}
              sx={{ marginBottom: 4 }}
              required
            />
            <TextField
              id='outlined-multiline-static'
              autoFocus
              multiline
              minRows={2}
              maxRows={10}
              fullWidth
              name='description'
              label={t('shop_description_placeholder_instruction')}
              sx={{ marginBottom: 4 }}
            />
            <Box
              sx={{ mb: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}
            ></Box>
            <Button type='submit' fullWidth size='large' variant='contained' sx={{ marginBottom: 7 }}>
              {t('create')} {loading && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
            <Box>
              {isError && serverMsg && (
                <Alert severity='error' sx={{ mb: 4 }}>
                  {t(serverMsg)}
                </Alert>
              )}
              {isSuccess && serverMsg && (
                <Alert severity='success' sx={{ mb: 4 }}>
                  {t(serverMsg)}
                </Alert>
              )}
            </Box>
          </form>
        </CardContent>
      </Card>
      {!isAuthenticate && <FooterIllustrationsV1 />}
    </Box>
  )
}

CreateShop.getLayout = (page: ReactNode) => <BlankLayout>{page}</BlankLayout>

export default CreateShop
