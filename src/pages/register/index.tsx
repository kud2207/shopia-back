// ** React Imports
import { useState, Fragment, ChangeEvent, MouseEvent, ReactNode, useEffect } from 'react'

// ** Next Imports
import Link from 'next/link'

// ** MUI Components
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import OutlinedInput from '@mui/material/OutlinedInput'
import { styled } from '@mui/material/styles'
import MuiCard, { CardProps } from '@mui/material/Card'
import InputAdornment from '@mui/material/InputAdornment'
import MuiFormControlLabel, { FormControlLabelProps } from '@mui/material/FormControlLabel'

// ** Icons Imports
import EyeOutline from 'mdi-material-ui/EyeOutline'
import EyeOffOutline from 'mdi-material-ui/EyeOffOutline'

// ** Configs
import themeConfig from 'src/configs/themeConfig'

// ** Layout Import
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** Demo Imports
import FooterIllustrationsV1 from 'src/views/pages/auth/FooterIllustration'
import { Alert, CircularProgress, FormLabel, Grid, MenuItem, Radio, RadioGroup, Select } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getPlans, registerUser } from 'src/@apiCore/npoints'
import 'react-international-phone/style.css'
import { MuiPhone } from 'src/@core/components/phone-tel'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { useCookies } from 'react-cookie'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { useSettings } from 'src/@core/hooks/useSettings'
import moment from 'moment'
import { isMobile } from 'react-device-detect'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['register']))
    }
  }
}

const ReactPasswordChecklist = dynamic(import('react-password-checklist'), {
  ssr: false
})

interface State {
  password: string
  showPassword: boolean
  confirmPassword: string
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
  marginTop: theme.spacing(1.5),
  marginBottom: theme.spacing(4),
  '& .MuiFormControlLabel-label': {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary
  }
}))

const RegisterPage = () => {
  // ** States
  const [values, setValues] = useState<State>({
    password: '',
    showPassword: false,
    confirmPassword: ''
  })
  const router = useRouter()
  const [agree, setAgree] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [load, setLoad] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorType, setErrorType] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    c_password: '',
    gender: 'male',
    role: (router.query.u != 'admin' && router.query.u) || 'marchand',
    subscription_date: '',
    plan: ''
  })

  const [errors, setErrors] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    c_password: ''
  })

  const { t, i18n } = useTranslation('register')
  const { setUser } = useGlobalContext()!
  const { settings } = useSettings()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cookies, setCookie] = useCookies(['token', 'user'])
  const [freePlan, setFreePlan] = useState<any>(null)

  const { ref } = router.query

  const handleChange = (prop: keyof State) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [prop]: event.target.value })
    setErrors({
      ...errors,
      [prop]: ''
    })
  }
  const handleClickShowPassword = () => {
    setValues({ ...values, showPassword: !values.showPassword })
  }
  const handleMouseDownPassword = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  // Handle input change
  const handleInputChange = (event: any) => {
    const { name, value } = event.target
    setFormData({
      ...formData,
      [name]: value
    })

    // Clear the error when the user starts typing
    setErrors({
      ...errors,
      [name]: ''
    })
  }

  const handleSubmit = (event: any) => {
    event.preventDefault()
    setIsError(false)
    const validationErrors = validateForm(formData)

    // If there are validation errors, set them in the state
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
    } else {
      if (formData.role == 'marchand') {
        formData.plan = freePlan?._id
        formData.subscription_date = moment().format('YYYY-MM-DD HH:m')
      }
      submitFormData(formData)
    }
  }

  // Validate the form fields
  const validateForm = (data: any) => {
    const validationErrors: any = {}

    if (!data.first_name.trim()) {
      validationErrors.first_name = t('required')
    }
    if (!data.last_name.trim()) {
      validationErrors.last_name = t('required')
    }
    if (!data.phone.trim()) {
      validationErrors.phone = t('required')
    }

    // Validate email
    if (!data.email.trim()) {
      validationErrors.email = t('required')
    } else if (!isEmailValid(data.email)) {
      validationErrors.email = t('wrong_email')
    }

    return validationErrors
  }

  // Email validation function
  const isEmailValid = (email: any) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    return emailRegex.test(email)
  }

  const submitFormData = (data: any) => {
    setLoad(true)
    if (ref) {
      data.referral = ref
    }
    registerUser(data)
      .then((response: any) => {
        if (response.data.ret) {
          setIsSuccess(response.status == 200)
          setIsError(response.status != 200)
          const newUser = response.data?.newUser
          if (newUser.role == 'marchand') {
            newUser.plan = freePlan
          }
          setUser(newUser)
          setCookie('token', JSON.stringify(response.data?.token), {
            path: '/',
            expires: new Date(response.data?.token?.expiresIn)
          })
          setCookie('user', JSON.stringify(newUser), {
            path: '/',
            expires: new Date(response.data?.token?.expiresIn)
          })
          if (response.data?.newUser.role == 'marchand') router.push('/shop/create')
          else router.push('/app')
        } else {
          setIsError(true)
          setIsSuccess(false)
          setErrorType(response.data.type)
        }
      })
      .catch((error: any) => {
        console.log(error)

        setIsError(true)
        setIsSuccess(false)
      })
      .finally(() => setLoad(false))
  }

  useEffect(() => {
    getPlans('yes').then(response => {
      if (response.status == 200) setFreePlan(response.data.data)
    })
  }, [])

  return (
    <Box className={!isMobile ? 'content-center' : ''}>
      <Card sx={{ zIndex: 1, width: ['100%', '60%'] }} className={isMobile ?'content-center':''}>
        <CardContent
          sx={{
            minHeight: isMobile ? '100vh' : 'auto',
            padding: isMobile ? '1px' : theme => `${theme.spacing(12, 9, 7)} !important`
          }}
          className={isMobile ? 'pt-20' : ''}
        >
          <Box sx={{ mb: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={`/images/logos/logo-${settings?.mode || 'dark'}.png`} alt='S' width={60} height={60} />

            <Typography
              variant='h6'
              sx={{
                ml: 1,
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
              {t('adventure')} 🚀
            </Typography>
            <Typography variant='body2'>{t('description')} </Typography>
          </Box>
          <form noValidate autoComplete='off' onSubmit={handleSubmit}>
            <Grid container spacing={7}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('first_name')}
                  placeholder='John'
                  name='first_name'
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                  error={Boolean(errors.first_name)}
                  helperText={errors.first_name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('last_name')}
                  placeholder='Doe'
                  name='last_name'
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                  error={Boolean(errors.last_name)}
                  helperText={errors.last_name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('email')}
                  placeholder='example@gmail.com'
                  name='email'
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  error={Boolean(errors.email)}
                  helperText={errors.email}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MuiPhone
                  value={formData.phone}
                  onChange={(phone: any) => {
                    setFormData({ ...formData, phone })
                    setErrors({
                      ...errors,
                      phone: ''
                    })
                  }}
                  error={Boolean(errors.phone)}
                  helperText={errors.phone}
                  label={t('phone')}
                  required
                />
              </Grid>
              {!router.query.u && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('type_account')}</InputLabel>
                    <Select label={t('type_account')} value={formData.role} onChange={handleInputChange} name='role'>
                      <MenuItem value='marchand'>{t('marchand')}</MenuItem>
                      <MenuItem value='livreur'>{t('delivery')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12} sm={router.query.u ? 12 : 6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ fontSize: '0.875rem' }}>{t('gender')}</FormLabel>
                  <RadioGroup row value={formData.gender} onChange={handleInputChange} name='gender'>
                    <FormControlLabel value='male' label={t('male')} control={<Radio />} />
                    <FormControlLabel value='female' label={t('female')} control={<Radio />} />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel htmlFor='auth-register-password'>{t('password')}</InputLabel>
                  <OutlinedInput
                    label={t('password')}
                    value={values.password}
                    id='auth-register-password'
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
                          {values.showPassword ? <EyeOutline fontSize='small' /> : <EyeOffOutline fontSize='small' />}
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
                    valueAgain={formData.c_password}
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
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel htmlFor='auth-register-password'>{t('cpassword')}</InputLabel>
                  <OutlinedInput
                    label={t('cpassword')}
                    name='c_password'
                    id='auth-register-password'
                    value={formData.c_password}
                    onChange={handleInputChange}
                    type={values.showPassword ? 'text' : 'password'}
                    error={Boolean(errors.c_password)}
                    endAdornment={
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          aria-label='toggle password visibility'
                        >
                          {values.showPassword ? <EyeOutline fontSize='small' /> : <EyeOffOutline fontSize='small' />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                  {errors.c_password && <span className='register-error'>{errors.c_password}</span>}
                </FormControl>
              </Grid>
            </Grid>

            <FormControlLabel
              control={<Checkbox checked={agree} onChange={e => setAgree(e.target.checked)} />}
              label={
                <Fragment>
                  <span>{t('i_agree_to')} </span>
                  <Link href='/terms' passHref>
                    <LinkStyled onClick={(e: MouseEvent<HTMLElement>) => e.preventDefault()}>
                      {t('policy_link')}
                    </LinkStyled>
                  </Link>
                </Fragment>
              }
            />

            {isError && (
              <Alert severity='error' sx={{ mb: 4 }}>
                {t(errorType)}
              </Alert>
            )}
            {isSuccess && (
              <Alert severity='success' sx={{ mb: 4 }}>
                {t('success')}
              </Alert>
            )}

            <Button
              disabled={!isValid || !agree}
              fullWidth
              size='large'
              type='submit'
              variant='contained'
              sx={{ marginBottom: 7 }}
            >
              {t('signup')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Typography variant='body2' sx={{ marginRight: 2 }}>
                {t('already_have_account')}
              </Typography>
              <Typography variant='body2'>
                <Link passHref href='/login'>
                  <LinkStyled>{t('login_instead')}</LinkStyled>
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

RegisterPage.getLayout = (page: ReactNode) => <BlankLayout>{page}</BlankLayout>

export default RegisterPage
