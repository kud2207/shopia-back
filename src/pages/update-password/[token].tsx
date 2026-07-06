// ** React Imports
import { ChangeEvent, MouseEvent, ReactNode, useEffect, useState } from 'react'

// ** MUI Components
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputLabel from '@mui/material/InputLabel'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import OutlinedInput from '@mui/material/OutlinedInput'
import { styled } from '@mui/material/styles'
import MuiCard, { CardProps } from '@mui/material/Card'
import InputAdornment from '@mui/material/InputAdornment'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

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
import { resetPassword, verifyToken } from 'src/@apiCore/npoints'
import { useRouter } from 'next/router'
import { useCookies } from 'react-cookie'
import { useGlobalContext } from 'src/@core/context/globalContext'
import dynamic from 'next/dynamic'

export async function getServerSideProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['reset']))
    }
  }
}

const ReactPasswordChecklist = dynamic(import('react-password-checklist'), {
  ssr: false
})

interface State {
  password: string
  confirmPassword: string
  showPassword: boolean
}

// ** Styled Components
const Card = styled(MuiCard)<CardProps>(({ theme }) => ({
  [theme.breakpoints.up('sm')]: { width: '28rem' }
}))

const UpdatePasswordPage = () => {
  // ** State
  const [load, setLoad] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [load1, setLoad1] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [isError, setIsError] = useState(false)
  const [values, setValues] = useState<State>({
    password: '',
    confirmPassword: '',
    showPassword: false
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cookies, setCookie] = useCookies(['token', 'user'])

  const router = useRouter()
  const { t, i18n } = useTranslation('reset')
  const { token } = router.query
  const { setUser } = useGlobalContext()!

  useEffect(() => {
    verifyToken(token)
      .then(res => {
        setIsTokenValid(res.status !== 401)
      })
      .finally(() => setLoad1(false))
  }, [token])

  const handleSubmit = (event: any) => {
    event.preventDefault()
    const data = {
      token,
      password: values.password
    }
    if (values.password && values.password == values.confirmPassword && isValid) {
      setLoad(true)
      resetPassword(data)
        .then((response: any) => {
          if (response.data && response.status == 200) {
            setUser(response.data?.user)
            setCookie('token', JSON.stringify(response.data?.token), {
              path: '/',
              expires: new Date(response.data?.token?.expiresIn)
            })
            setCookie('user', JSON.stringify(response.data?.user), {
              path: '/',
              expires: new Date(response.data?.token?.expiresIn)
            })
            router.push('/')
          } else {
            setIsError(response.status != 200)
          }
        })
        .catch(() => {
          setIsError(true)
        })
        .finally(() => setLoad(false))
    }
  }

  const handleChange = (prop: keyof State) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [prop]: event.target.value })
  }

  const handleClickShowPassword = () => {
    setValues({ ...values, showPassword: !values.showPassword })
  }

  const handleMouseDownPassword = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  return (
    <Box className='content-center'>
      {load1 ? (
        <CircularProgress size={50} color='inherit' />
      ) : (
        <Card sx={{ zIndex: 1 }}>
          <CardContent sx={{ padding: theme => `${theme.spacing(12, 9, 7)} !important` }}>
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
            {!isTokenValid ? (
              <>
                <Alert severity='info' sx={{ mb: 4 }}>
                  {t('link_expired')}
                </Alert>
                <Button
                  fullWidth
                  disabled={load}
                  size='large'
                  variant='contained'
                  sx={{ marginBottom: 7 }}
                  onClick={() => router.push('/reset-password')}
                >
                  {t('retry')}
                </Button>
              </>
            ) : (
              <>
                <Box sx={{ mb: 6 }}>
                  <Typography variant='h5' sx={{ fontWeight: 600, marginBottom: 1.5 }}>
                    {t('update_title')}🔑
                  </Typography>
                  <Typography variant='body2'>{t('update_text')}</Typography>
                </Box>
                <form autoComplete='off' onSubmit={handleSubmit}>
                  <FormControl fullWidth sx={{ mb: 4 }}>
                    <InputLabel htmlFor='auth-login-password'>{t('new_password')}</InputLabel>
                    <OutlinedInput
                      label='Password'
                      value={values.password}
                      id='auth-login-password'
                      onChange={handleChange('password')}
                      type={values.showPassword ? 'text' : 'password'}
                      required
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
                  <FormControl fullWidth sx={{ mb: 4 }}>
                    <InputLabel htmlFor='auth-login-password'>{t('confirm_password')}</InputLabel>
                    <OutlinedInput
                      label='Password'
                      value={values.confirmPassword}
                      id='auth-login-password'
                      onChange={handleChange('confirmPassword')}
                      type={values.showPassword ? 'text' : 'password'}
                      required
                      error={!isValid && values.confirmPassword != ''}
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
                  {values.password && (
                    <ReactPasswordChecklist
                      rules={['minLength', 'number', 'capital', 'match']}
                      minLength={6}
                      value={values.password}
                      valueAgain={values.confirmPassword}
                      onChange={(val: boolean) => setIsValid(val)}
                      messages={
                        i18n.language == 'fr'
                          ? {
                              minLength: 'Le mot de passe comporte au moins 6 caractères.',
                              number: 'Le mot de passe comporte un chiffre.',
                              capital: 'Le mot de passe comporte une majuscule.',
                              match: 'Les mots de passe correspondent.'
                            }
                          : {}
                      }
                    />
                  )}
                  {isError && (
                    <Alert severity='error' sx={{ mb: 4 }}>
                      {t('update_error')}
                    </Alert>
                  )}
                  <Button
                    fullWidth
                    disabled={load || !isValid}
                    size='large'
                    variant='contained'
                    sx={{ mb: 7, mt: 4 }}
                    type='submit'
                  >
                    {t('update')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      )}
      <FooterIllustrationsV1 />
    </Box>
  )
}

UpdatePasswordPage.getLayout = (page: ReactNode) => <BlankLayout>{page}</BlankLayout>

export default UpdatePasswordPage
