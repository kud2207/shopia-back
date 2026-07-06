// ** React Imports
import { ReactNode, useState } from 'react'

// ** Next Imports
import Link from 'next/link'

// ** MUI Components
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { styled } from '@mui/material/styles'
import MuiCard, { CardProps } from '@mui/material/Card'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

// ** Configs
import themeConfig from 'src/configs/themeConfig'

// ** Layout Import
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** Demo Imports
import FooterIllustrationsV1 from 'src/views/pages/auth/FooterIllustration'

import { useTranslation } from 'next-i18next'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { forgotPassword } from 'src/@apiCore/npoints'
import { isMobile } from 'react-device-detect'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['reset']))
    }
  }
}

// ** Styled Components
const Card = styled(MuiCard)<CardProps>(({ theme }) => ({
  [theme.breakpoints.up('sm')]: { width: '28rem' }
}))

const LinkStyled = styled('a')(({ theme }) => ({
  fontSize: '0.875rem',
  textDecoration: 'none',
  color: theme.palette.primary.main
}))

const ResetPasswordPage = () => {
  const [load, setLoad] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const { t, i18n } = useTranslation('reset')

  const handleSubmit = (event: any) => {
    event.preventDefault()
    const data = new FormData(event.target)
    if (data.get('email')) {
      setLoad(true)
      forgotPassword(data.get('email'), i18n.language)
        .then((response: any) => {
          if (response.data) {
            setIsSuccess(response.status == 200)
            setIsError(response.status != 200)
          }
        })
        .catch((error: any) => {
          console.log(error)
          setIsError(true)
          setIsSuccess(false)
        })
        .finally(() => setLoad(false))
    }
  }

  return (
    <Box className={!isMobile ? 'content-center' : ''}>
      <Card sx={{ zIndex: 1 }}>
        <CardContent
          sx={{
            minHeight: isMobile ? '100vh' : 'auto',
            padding: isMobile ? '16px' : theme => `${theme.spacing(12, 9, 7)} !important`
          }}
          className={isMobile ? 'pt-20' : ''}
        >
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
              {t('title')} 🔑
            </Typography>
            <Typography variant='body2'>{t('text')}</Typography>
          </Box>
          <form autoComplete='off' onSubmit={handleSubmit}>
            <TextField
              autoFocus
              fullWidth
              name='email'
              id='email'
              label={t('email_placeholder')}
              sx={{ mb: 4 }}
              type='email'
              required
            />
            {isError && (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t('error')}
              </Alert>
            )}
            {isSuccess && (
              <Alert severity='success' sx={{ mb: 4 }}>
                {t('success')}
              </Alert>
            )}
            <Button fullWidth disabled={load} size='large' variant='contained' sx={{ marginBottom: 7 }} type='submit'>
              {t('send')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Typography variant='body2' sx={{ marginRight: 2 }}>
                {t('have_account')}
              </Typography>
              <Typography variant='body2'>
                <Link passHref href='/login'>
                  <LinkStyled> {t('signin')} </LinkStyled>
                </Link>
              </Typography>
            </Box>
          </form>
        </CardContent>
      </Card>
      <FooterIllustrationsV1 />
    </Box>
  )
}

ResetPasswordPage.getLayout = (page: ReactNode) => <BlankLayout>{page}</BlankLayout>

export default ResetPasswordPage
