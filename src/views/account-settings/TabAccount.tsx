// ** React Imports
import { useState, ElementType, ChangeEvent, useEffect } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Select from '@mui/material/Select'
import { styled } from '@mui/material/styles'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import InputLabel from '@mui/material/InputLabel'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import Button, { ButtonProps } from '@mui/material/Button'

// ** Icons Imports
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { CircularProgress, Divider, FormControlLabel, FormLabel, Radio, RadioGroup } from '@mui/material'
import { MuiPhone } from 'src/@core/components/phone-tel'
import { useCookies } from 'react-cookie'
import { getCountries, updateAccount } from 'src/@apiCore/npoints'

const ImgStyled = styled('img')(({ theme }) => ({
  width: 120,
  height: 120,
  marginRight: theme.spacing(6.25),
  borderRadius: theme.shape.borderRadius
}))

const ButtonStyled = styled(Button)<ButtonProps & { component?: ElementType; htmlFor?: string }>(({ theme }) => ({
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    textAlign: 'center'
  }
}))

const ResetButtonStyled = styled(Button)<ButtonProps>(({ theme }) => ({
  marginLeft: theme.spacing(4.5),
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    marginLeft: 0,
    textAlign: 'center',
    marginTop: theme.spacing(4)
  }
}))

const TabAccount = () => {
  // ** State
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cookies, setCookie] = useCookies(['token', 'user'])
  const [countries, setCountries] = useState([])
  const [load, setLoad] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorType, setErrorType] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const { setUser, user } = useGlobalContext()

  const [formData, setFormData] = useState({
    first_name: user?.first_name,
    last_name: user?.last_name,
    email: user?.email,
    role: user?.role,
    imgSrc: user?.image,
    phone: user?.phone,
    gender: user?.sexe,
    country: user?.country || '',
    logoSrc: user?.logo || '/images/logos/service.png',
    companyName: user?.companyName,
    companyEmail: user?.companyEmail,
    companyPhone: user?.companyPhone,
    description: user?.description,
    momoPhone: user?.momoPhone,
    ibanNumber: user?.ibanNumber
  })

  const [errors, setErrors] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    companyName: ''
  })
  const { t, i18n } = useTranslation('account')
  const [file, setFile] = useState<FileList | null>(null)
  const [logoFile, setLogoFile] = useState<FileList | null>(null)

  useEffect(() => {
    getCountries()
      .then(response => {
        if (response.data.success) {
          setCountries(response.data.data)
        }
      })
      .catch(err => {
        console.log(err)
      })
  }, [])

  const onChange = (file: ChangeEvent) => {
    const reader = new FileReader()
    const { files } = file.target as HTMLInputElement
    setFile(files)
    if (files && files.length !== 0) {
      reader.onload = () => setFormData({ ...formData, imgSrc: reader.result as string })

      reader.readAsDataURL(files[0])
    }
  }

  const onChangeLogo = (file: ChangeEvent) => {
    const reader = new FileReader()
    const { files } = file.target as HTMLInputElement
    setLogoFile(files)
    if (files && files.length !== 0) {
      reader.onload = () => setFormData({ ...formData, logoSrc: reader.result as string })

      reader.readAsDataURL(files[0])
    }
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

  const resetProfileImage = () => {
    setFile(null)
    if (user?.sexe === 'male') {
      setFormData({ ...formData, imgSrc: '/images/avatars/1.png' })
    } else {
      setFormData({ ...formData, imgSrc: '/images/avatars/2.png' })
    }
  }

  const resetLogoImage = () => {
    setLogoFile(null)
    setFormData({ ...formData, logoSrc: '/images/logos/service.png' })
  }

  const handleSubmit = (event: any) => {
    event.preventDefault()
    setIsError(false)
    const validationErrors = validateForm(formData)

    // If there are validation errors, set them in the state
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
    } else {
      submitFormData()
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

  const isEmailValid = (email: any) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    return emailRegex.test(email)
  }

  const submitFormData = () => {
    setLoad(true)
    const formValues = new FormData()
    if (file) {
      formValues.append('file', file[0])
    }
    formValues.append('first_name', formData.first_name)
    formValues.append('last_name', formData.last_name)
    formValues.append('phone', formData.phone)
    formValues.append('email', formData.email)
    formValues.append('sexe', formData.gender)
    if (formData.country) formValues.append('country', formData.country)
    if (user.role == 'livreur') {
      formValues.append('companyPhone', formData.companyPhone)
      formValues.append('companyName', formData.companyName)
      formValues.append('companyEmail', formData.companyEmail)
      if (logoFile) formValues.append('logo_file', logoFile[0])
    }

    if (user.role == 'partenaire') {
      formValues.append('momoPhone', formData.momoPhone)
      formValues.append('ibanNumber', formData.ibanNumber)
    }
    updateAccount(formValues)
      .then((response: any) => {
        if (response.data.ret) {
          setIsSuccess(response.status == 200)
          setIsError(response.status != 200)
          setUser(response.data?.user)
          setCookie('user', JSON.stringify(response.data?.user), {
            path: '/'
          })
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

  return (
    <CardContent>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={7}>
          <Grid item xs={12} sx={{ marginTop: 4.8, marginBottom: 3 }}>
            <Box className='d-sm-block' sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent:"center" }}>
              <ImgStyled src={formData.imgSrc} alt='Profile Pic' />
              </Box>
              <Box mt={2}>
                <ButtonStyled component='label' variant='contained' htmlFor='account-settings-upload-image'>
                  {t('upload')}
                  <input
                    hidden
                    type='file'
                    onChange={onChange}
                    accept='image/png, image/jpeg'
                    id='account-settings-upload-image'
                  />
                </ButtonStyled>
                <ResetButtonStyled color='error' variant='outlined' onClick={resetProfileImage}>
                  {t('reset')}
                </ResetButtonStyled>
                <Typography variant='body2' sx={{ marginTop: 5 }}>
                  {t('image_format')}
                </Typography>
              </Box>
            </Box>
          </Grid>

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
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('country')}</InputLabel>
              <Select
                label={t('country')}
                placeholder={`${t('country')}`}
                value={formData.country}
                onChange={handleInputChange}
                name='country'
              >
                {countries?.map((country: any) => {
                  return (
                    <MenuItem key={country?._id} value={country._id}>
                      {country[i18n.language] || country.en}
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label={t('type_account')} name='role' value={t(formData.role)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl>
              <FormLabel sx={{ fontSize: '0.875rem' }}>{t('gender')}</FormLabel>
              <RadioGroup row value={formData.gender} onChange={handleInputChange} name='gender'>
                <FormControlLabel value='male' label={t('male')} control={<Radio />} />
                <FormControlLabel value='female' label={t('female')} control={<Radio />} />
              </RadioGroup>
            </FormControl>
          </Grid>

          {user?.role == 'livreur' && (
            <Grid item xs={12} container spacing={10}>
              <Grid item xs={12}>
                <Divider />
                <Typography variant='h6'>{t('company_info')}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ImgStyled src={formData.logoSrc} alt='Profile Pic' />
                  <Box>
                    <ButtonStyled component='label' variant='contained' htmlFor='account-settings-upload-logo'>
                      {t('upload_logo')}
                      <input
                        hidden
                        type='file'
                        onChange={onChangeLogo}
                        accept='image/png, image/jpeg'
                        id='account-settings-upload-logo'
                      />
                    </ButtonStyled>
                    <ResetButtonStyled color='error' variant='outlined' onClick={resetLogoImage}>
                      {t('reset')}
                    </ResetButtonStyled>
                    <Typography variant='body2' sx={{ marginTop: 5 }}>
                      {t('image_format')}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={12}>
                <TextField
                  fullWidth
                  label={t('company_name')}
                  placeholder='Ex: Fast delivery'
                  name='companyName'
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                  error={Boolean(errors.companyName)}
                  helperText={errors.companyName}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('email')}
                  placeholder='example@gmail.com'
                  name='companyEmail'
                  value={formData.companyEmail}
                  onChange={handleInputChange}
                  error={Boolean(errors.email)}
                  helperText={errors.email}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MuiPhone
                  value={formData.companyPhone}
                  onChange={(phone: any) => {
                    setFormData({ ...formData, companyPhone: phone })
                    setErrors({
                      ...errors,
                      phone: ''
                    })
                  }}
                  error={Boolean(errors.phone)}
                  helperText={errors.phone}
                  label={t('whatsapp_phone')}
                />
              </Grid>
            </Grid>
          )}

          {user?.role == 'partenaire' && (
            <Grid item xs={12} container spacing={10}>
              <Grid item xs={12}>
                <Divider />
                <Typography variant='h6'>{t('payment_info')}</Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <MuiPhone
                  value={formData.momoPhone}
                  onChange={(phone: any) => {
                    setFormData({ ...formData, momoPhone: phone })
                    setErrors({
                      ...errors,
                      phone: ''
                    })
                  }}
                  error={Boolean(errors.phone)}
                  helperText={errors.phone}
                  label={t('momo_phone')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('iban_number')}
                  placeholder=''
                  name='ibanNumber'
                  value={formData.ibanNumber}
                  onChange={handleInputChange}
                  error={Boolean(errors.companyName)}
                  helperText={errors.companyName}
                />
              </Grid>
             
            </Grid>
          )}
          <Grid item xs={12}>
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
          </Grid>

          <Grid item xs={12}>
            <Button variant='contained' sx={{ marginRight: 3.5 }} type='submit'>
              {t('save')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
          </Grid>
        </Grid>
      </form>
    </CardContent>
  )
}

export default TabAccount
