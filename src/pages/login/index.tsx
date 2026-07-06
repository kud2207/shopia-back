// ** React Imports
import { ChangeEvent, MouseEvent, ReactNode, useEffect, useState } from 'react'

// ** Next Imports
import Link from 'next/link'

// ** MUI Components
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import InputLabel from '@mui/material/InputLabel'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import OutlinedInput from '@mui/material/OutlinedInput'
import { styled } from '@mui/material/styles'
import MuiCard, { CardProps } from '@mui/material/Card'
import InputAdornment from '@mui/material/InputAdornment'
import MuiFormControlLabel, { FormControlLabelProps } from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import { isMobile } from 'react-device-detect'

// ** Icons Imports
import EyeOutline from 'mdi-material-ui/EyeOutline'
import EyeOffOutline from 'mdi-material-ui/EyeOffOutline'

// ** Configs
import themeConfig from 'src/configs/themeConfig'

// ** Layout Import
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** Demo Imports
import FooterIllustrationsV1 from 'src/views/pages/auth/FooterIllustration'

import { useTranslation } from 'next-i18next'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Alert from '@mui/material/Alert'
import { loginUser } from 'src/@apiCore/npoints'
import { useRouter } from 'next/router'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { useCookies } from 'react-cookie'
import { useSettings } from 'src/@core/hooks/useSettings'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common']))
    }
  }
}

interface State {
  password: string
  showPassword: boolean
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

const FormControlLabel = styled(MuiFormControlLabel)<FormControlLabelProps>(({ theme }) => ({
  '& .MuiFormControlLabel-label': {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary
  }
}))

const LoginPage = () => {
  // ** State
  const [values, setValues] = useState<State>({
    password: '',
    showPassword: false
  })
  const [load, setLoad] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [Msg, setMsg] = useState('')
  const [fieldErr, setFieldErr] = useState('')
  const { settings } = useSettings()

  const { t } = useTranslation('common')

  // ** Hook
  const router = useRouter()
  const { setUser, setShops } = useGlobalContext()
  const [cookies, setCookie] = useCookies(['token', 'user'])
  const handleChange = (prop: keyof State) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [prop]: event.target.value })
  }

  const handleSubmitForm = (event: any) => {
    event.preventDefault()
    const username = event.target.elements['username'].value
    const password = event.target.elements['password'].value
    setIsError(false)
    setIsSuccess(false)
    if (username && password) {
      setLoad(true)
      setFieldErr('')
      loginUser({ username, password, cookies })
        .then((response: any) => {
          if (response.data) {
            setIsSuccess(response.status == 200)
            setIsError(response.status != 200)
            setMsg(response.data.message)
            if (response.status == 200) {
              setUser(response.data?.user)
              setShops(response.data?.user?.shops)
              setCookie('token', JSON.stringify(response.data?.token), {
                path: '/',
                expires: new Date(response.data?.token?.expiresIn)
              })
              setCookie('user', JSON.stringify(response.data?.user), {
                path: '/',
                expires: new Date(response.data?.token?.expiresIn)
              })
              console.log(response.data)
              if (
                response.data.user.hasShop ||
                response.data.user.role == 'livreur' ||
                response.data.user.role == 'partenaire' ||
                response.data.user.role == 'admin'
              ) {
                router.push('/app')
              } else {
                router.push('/shop/create')
              }
            }
          }
        })
        .catch((error: any) => {
          console.log(error)
          setIsError(true)
          setMsg(error.message)
          setIsSuccess(false)
        })
        .finally(() => setLoad(false))
    } else {
      setFieldErr('remplissez correctement les champs')
    }
  }

  const handleClickShowPassword = () => {
    setValues({ ...values, showPassword: !values.showPassword })
  }

  const handleMouseDownPassword = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  return (
    <Box className={!isMobile ?'content-center':''}>
      <Card sx={{ zIndex: 1 }} className={isMobile ?'content-center':''}>
        <CardContent sx={{ minHeight:isMobile?"100vh":"auto", padding: isMobile? "1px": theme => `${theme.spacing(12, 9, 7)} !important` }} className={isMobile ?'pt-20':''}>
          <Box sx={{ mb: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={`/images/logos/logo-${settings?.mode || 'dark'}.png`} alt='S' width={50} height={50} />
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
            <Typography variant='body2'>{t('signin_instruction')}</Typography>
          </Box>
          <form noValidate autoComplete='off' onSubmit={handleSubmitForm}>
            <TextField
              autoFocus
              fullWidth
              id='username'
              name='username'
              label={t('email_phone')}
              sx={{ marginBottom: 4 }}
            />
            <FormControl fullWidth>
              <InputLabel htmlFor='auth-login-password'>{t('password')}</InputLabel>
              <OutlinedInput
                label='Password'
                value={values.password}
                name='password'
                id='auth-login-password'
                onChange={handleChange('password')}
                type={values.showPassword ? 'text' : 'password'}
                endAdornment={
                  <InputAdornment position='end'>
                    <IconButton
                      edge='end'
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      aria-label='toggle password visibility'
                    >
                      {values.showPassword ? <EyeOutline /> : <EyeOffOutline />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            </FormControl>
            <Box
              sx={{ mb: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}
            >
              <FormControlLabel control={<Checkbox />} label={t('remember_me')} />
              <Link passHref href='/reset-password'>
                <LinkStyled>{t('forgot_password')}</LinkStyled>
              </Link>
            </Box>
            {isError && Msg && (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(Msg)}
              </Alert>
            )}
            {isSuccess && Msg && (
              <Alert severity='success' sx={{ mb: 4 }}>
                {t(Msg)}
              </Alert>
            )}
            {fieldErr && (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(fieldErr)}
              </Alert>
            )}
            <Button type='submit' disabled={load} fullWidth size='large' variant='contained' sx={{ marginBottom: 7 }}>
              {t('login')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Typography variant='body2' sx={{ marginRight: 2 }}>
                {t('new_here_question')}
              </Typography>
              <Typography variant='body2'>
                <Link passHref href='/register'>
                  <LinkStyled>{t('create_account_instruction_label')}</LinkStyled>
                </Link>
              </Typography>
            </Box>
          </form>
        </CardContent>
      </Card>
      {!isMobile && <FooterIllustrationsV1 />}
    </Box>
  )
}

LoginPage.getLayout = (page: ReactNode) => <BlankLayout>{page}</BlankLayout>

export default LoginPage
