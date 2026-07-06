// ** React Imports
import { ChangeEvent, MouseEvent, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import InputLabel from '@mui/material/InputLabel'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import OutlinedInput from '@mui/material/OutlinedInput'
import InputAdornment from '@mui/material/InputAdornment'

// ** Icons Imports
import EyeOutline from 'mdi-material-ui/EyeOutline'
import KeyOutline from 'mdi-material-ui/KeyOutline'
import EyeOffOutline from 'mdi-material-ui/EyeOffOutline'
import { useTranslation } from 'react-i18next'
import dynamic from 'next/dynamic'
import { updatePassword } from 'src/@apiCore/npoints'
import { Alert, CircularProgress } from '@mui/material'

const ReactPasswordChecklist = dynamic(import('react-password-checklist'), {
  ssr: false
})
interface State {
  newPassword: string
  currentPassword: string
  showNewPassword: boolean
  confirmNewPassword: string
  showCurrentPassword: boolean
  showConfirmNewPassword: boolean
  isValid: boolean
}

const TabSecurity = () => {
  // ** States
  const [values, setValues] = useState<State>({
    newPassword: '',
    currentPassword: '',
    showNewPassword: false,
    confirmNewPassword: '',
    showCurrentPassword: false,
    showConfirmNewPassword: false,
    isValid: false
  })
  const [load, setLoad] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  //translation function
  const { t, i18n } = useTranslation('reset')

  // Handle Current Password
  const handleCurrentPasswordChange = (prop: keyof State) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [prop]: event.target.value })
  }
  const handleClickShowCurrentPassword = () => {
    setValues({ ...values, showCurrentPassword: !values.showCurrentPassword })
  }
  const handleMouseDownCurrentPassword = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  // Handle New Password
  const handleNewPasswordChange = (prop: keyof State) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [prop]: event.target.value })
    setIsError(false)
    setIsSuccess(false)
  }
  const handleClickShowNewPassword = () => {
    setValues({ ...values, showNewPassword: !values.showNewPassword })
  }
  const handleMouseDownNewPassword = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  // Handle Confirm New Password
  const handleConfirmNewPasswordChange = (prop: keyof State) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [prop]: event.target.value })
    setIsError(false)
    setIsSuccess(false)
  }
  const handleClickShowConfirmNewPassword = () => {
    setValues({ ...values, showConfirmNewPassword: !values.showConfirmNewPassword })
  }

  const handleValidChange = (value: boolean) => {
    setValues({ ...values, isValid: value })
  }

  const handleMouseDownConfirmNewPassword = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  const handleSubmit = (event: any) => {
    event.preventDefault()
    const data = {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword
    }
    if (
      values.newPassword &&
      values.newPassword == values.confirmNewPassword &&
      values.isValid &&
      values.newPassword != values.currentPassword
    ) {
      setLoad(true)
      updatePassword(data)
        .then((response: any) => {
          setIsError(response.status != 200)
          setIsSuccess(response.status == 200)
          if (response.status != 200) setErrorMessage(response.data.message)
        })
        .catch((error: any) => {
          console.log(error)
          setIsError(true)
          setErrorMessage(error.message)
        })
        .finally(() => setLoad(false))
    } else {
      setIsError(true)
      setErrorMessage('same_password')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent sx={{ paddingBottom: 0 }}>
        <Box sx={{ mt: 1.75, display: 'flex', alignItems: 'center' }}>
          <KeyOutline sx={{ marginRight: 3 }} />
          <Typography variant='h6'>{t('update_title')}</Typography>
        </Box>
        <Grid container spacing={5}>
          <Grid item xs={12} sm={6}>
            <Grid container spacing={5}>
              <Grid item xs={12} sx={{ marginTop: 4.75 }}>
                <FormControl fullWidth>
                  <InputLabel htmlFor='account-settings-current-password'>{t('current_password')}</InputLabel>
                  <OutlinedInput
                    label={t('current_password')}
                    value={values.currentPassword}
                    id='account-settings-current-password'
                    type={values.showCurrentPassword ? 'text' : 'password'}
                    onChange={handleCurrentPasswordChange('currentPassword')}
                    endAdornment={
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          aria-label='toggle password visibility'
                          onClick={handleClickShowCurrentPassword}
                          onMouseDown={handleMouseDownCurrentPassword}
                        >
                          {values.showCurrentPassword ? <EyeOutline /> : <EyeOffOutline />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12} sx={{ marginTop: 6 }}>
                <FormControl fullWidth>
                  <InputLabel htmlFor='account-settings-new-password'>{t('new_password')}</InputLabel>
                  <OutlinedInput
                    label={t('new_password')}
                    value={values.newPassword}
                    id='account-settings-new-password'
                    onChange={handleNewPasswordChange('newPassword')}
                    type={values.showNewPassword ? 'text' : 'password'}
                    endAdornment={
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          onClick={handleClickShowNewPassword}
                          aria-label='toggle password visibility'
                          onMouseDown={handleMouseDownNewPassword}
                        >
                          {values.showNewPassword ? <EyeOutline /> : <EyeOffOutline />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel htmlFor='account-settings-confirm-new-password'>{t('confirm_new_password')}</InputLabel>
                  <OutlinedInput
                    label={t('confirm_new_password')}
                    value={values.confirmNewPassword}
                    id='account-settings-confirm-new-password'
                    type={values.showConfirmNewPassword ? 'text' : 'password'}
                    onChange={handleConfirmNewPasswordChange('confirmNewPassword')}
                    error={!values.isValid && values.confirmNewPassword != ''}
                    endAdornment={
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          aria-label='toggle password visibility'
                          onClick={handleClickShowConfirmNewPassword}
                          onMouseDown={handleMouseDownConfirmNewPassword}
                        >
                          {values.showConfirmNewPassword ? <EyeOutline /> : <EyeOffOutline />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                {values.newPassword && !isError && !isSuccess && (
                  <ReactPasswordChecklist
                    rules={['minLength', 'number', 'capital', 'match']}
                    minLength={6}
                    value={values.newPassword}
                    valueAgain={values.confirmNewPassword}
                    onChange={(val: boolean) => handleValidChange(val)}
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
            </Grid>
          </Grid>

          <Grid
            item
            sm={6}
            xs={12}
            sx={{ display: 'flex', marginTop: [7.5, 2.5], alignItems: 'center', justifyContent: 'center' }}
          >
            <img width={183} alt='avatar' height={256} src='/images/pages/pose-m-1.png' />
          </Grid>
        </Grid>
        {isError && (
          <Alert severity='error' sx={{ mb: 4 }}>
            {t(errorMessage ?? 'update_error')}
          </Alert>
        )}
        {isSuccess && (
          <Alert severity='success' sx={{ mb: 4 }}>
            {t('update_success')}
          </Alert>
        )}
        <Box sx={{ mt: 5 }}>
          <Button type='submit' variant='contained' disabled={load || !values.isValid} sx={{ marginRight: 3.5 }}>
            {t('update')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
          </Button>
          <Button
            type='reset'
            variant='outlined'
            color='secondary'
            onClick={() => setValues({ ...values, currentPassword: '', newPassword: '', confirmNewPassword: '' })}
          >
            {t('reset')}
          </Button>
        </Box>
      </CardContent>
    </form>
  )
}
export default TabSecurity
