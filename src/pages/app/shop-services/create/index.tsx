// ** React Imports
import React, { ChangeEvent, ElementType, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import { styled } from '@mui/material/styles'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import InputLabel from '@mui/material/InputLabel'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import Button, { ButtonProps } from '@mui/material/Button'

// ** Third Party Styles Imports
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'react-i18next'
import { Autocomplete, Grid, IconButton, InputAdornment, OutlinedInput, Step, StepLabel, Stepper, Typography } from '@mui/material'
import Link from 'next/link'
import { createAPricing, createCompanyService, getUsersById } from 'src/@apiCore/npoints'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { CircularProgress } from '@mui/material'
import { MuiPhone } from 'src/@core/components/phone-tel'
import { useRouter } from 'next/router'
import { EyeOffOutline, EyeOutline } from 'mdi-material-ui'
import MultipleSelectChip from 'src/@core/components/multi-select'
import dynamic from 'next/dynamic'
import SelectZones from 'src/@core/components/SelectZone'
import { toast } from 'react-toastify'
import { DeliveryServiceInterface } from 'src/types'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common', 'service']))
    }
  }
}
const ReactPasswordChecklist = dynamic(import('react-password-checklist'), {
  ssr: false
})
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

const AccountSettings = () => {
  const { t, i18n } = useTranslation('service')

  //* state
  const [load, setLoad] = useState(false)
  const [load1, setLoad1] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorType, setErrorType] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const { shops, activeShop } = useGlobalContext()
  const [selectedShops, setSelectedShops] = useState([activeShop])
  const [adress, setAdress] = useState([{country: activeShop?.country, city: activeShop?.city, adress: ''}])
  const [listTarif, setListTarif] = useState([{country: '', city: '', zone: [], tarif: 0}])
  const [activeStep, setActiveStep] = useState(0);
  const [isMyService, setIsMyService] = useState(true)
  const [deliverCompany, setDeliverCompany] = useState<DeliveryServiceInterface>()
  const [formData, setFormData] = useState({
    email: '',
    imgSrc: '/images/avatars/1.png',
    phone: '',
    service_name: '',
    description: '',
    pass: ''
  })
  const [errors, setErrors] = useState({
    email: '',
    service_name: '',
    description: '',
    phone: '',
    companyName: ''
  })
  const [file, setFile] = useState<FileList | null>(null)
  
  // useEffect(() => {
  //   if (id) {
  //     setLoad1(true)
  //     getUsersById(id).then(response => {
  //       if (response.status == 200) {
  //         const data = response.data.data
  //         if (data) {
  //           setFormData({
  //             email: data?.email,
  //             imgSrc: data?.image || 'images/avatars/1.png',
  //             phone: data?.phone,
  //             service_name: '',
  //             description: data?.description,
  //             pass: ''
  //           })
  //           setSelectedShops(data.shops)
  //           setLoad1(false)
  //         }
  //       }
  //     })
  //   }
  // }, [id])

  const onChange = (file: ChangeEvent) => {
    const reader = new FileReader()
    const { files } = file.target as HTMLInputElement
    setFile(files)
    if (files && files.length !== 0) {
      reader.onload = () => setFormData({ ...formData, imgSrc: reader.result as string })
      reader.readAsDataURL(files[0])
    }
  }

  const handleInputChange = (event: any) => {
    const { name, value } = event.target
    setFormData({
      ...formData,
      [name]: value
    })

    setErrors({
      ...errors,
      [name]: ''
    })
  }

  const resetProfileImage = () => {
    setFile(null)
    setFormData({ ...formData, imgSrc: '/images/avatars/1.png' })
  }

  const handleSubmit = (event: any) => {
    event.preventDefault()
    setIsError(false)

    if(activeStep === 0) {
      const validationErrors = validateCompanyForm(formData)
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
      } else {
        createDeliverCompany()
      }
    }else{
      handlePricing()
    }
  }
  
  const handleValidChange = (value: boolean) => {
    setIsValid(value)
  }
  // Validate the form fields
  const validateCompanyForm = (data: any) => {
    const validationErrors: any = {}

    if (!data.service_name.trim()) {
      validationErrors.service_name = t('required')
    }
    if (!data.description.trim()) {
      validationErrors.description = t('required')
    }
    if (!isMyService && !data.phone.trim()) {
      validationErrors.phone = t('required')
    }
    if (!isMyService && !data.email.trim()) {
      validationErrors.email = t('required')
    }

    return validationErrors
  }

  const handlePricing = async () => {
  let pricingSuccess: boolean[] = [];
  let response

  if (deliverCompany?._id && listTarif.length) {
    try {
      for (const { zone, tarif } of listTarif) {
        await Promise.all(
          zone.map(async (z:any) => {
            let data = {
              zone: z?._id,
              price: tarif,
              deliveryCompany: deliverCompany?._id,
            };

            response = await createAPricing(data);
            pricingSuccess.push(response.status === 201);
          })
        );
      }

      let isSuccess = pricingSuccess.every((success) => success);
      console.log(isSuccess)
      if (isSuccess) {

        toast.success(t('pricing_created_success'));
        router.back()
      } else {
        setIsError(true)
        setIsSuccess(false)
        setErrorType(response?.data?.type)
        toast.error(t('pricing_created_error'));
      }
    } catch (error) {
      console.error("Error creating pricing:", error);
      toast.error(t('pricing_created_error'));
    }
  }
};


  const createDeliverCompany = () => {
    setLoad(true)
    const formValues = new FormData()
    if (file) {
      formValues.append('image', file[0])
    }
    formValues.append('name', formData.service_name)
    formValues.append('description', formData.description)
    formValues.append('type', isMyService ? 'internal' : 'partner')
    formValues.append('shops', selectedShops?.map((item)=>item?._id).toString())
    formValues.append('address', JSON.stringify(adress))
    if(!isMyService){
      formValues.append('email', formData.email)
      formValues.append('phone', formData.phone)
      formValues.append('c_password', formData.pass)
    }
    
    
      createCompanyService(formValues)
        .then((response: any) => {
          if (response.data && response.status == 201) {
            toast.success(t('service_company_created'))
            setIsSuccess(true)
            setIsError(false)
            setDeliverCompany(response.data.data)
            setListTarif(adress.map(({country, city}) =>  { return {country, city, zone: [], tarif: 0}}))
            setActiveStep(1)
          } else {
            toast.error(t('service_company_created_error'))
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

  const steps = [t('general_info'), t('pricing')];

  const removeAdress = (ind:number) => {
    if(adress.length > 1){
      let newAdress = adress.filter((a, i) => i !== ind)
      setAdress(newAdress)
    }
    
  }

  const removeTarif = (ind:number) => {
    if(listTarif.length > 1){
      let newListTarif = listTarif.filter((a, i) => i !== ind)
      setListTarif(newListTarif)
    }
  }

  return (
    <Grid item xs={12}>
      <Grid style={{ marginBottom: 20 }}>
        <Typography variant='h5'>
          <Link href='#'>{t('add_service')}</Link>
        </Typography>
        <Typography variant='body2'>
         {t('add_text')}
        </Typography>
      </Grid>
      <Card>
        <CardContent>
          <Stepper alternativeLabel activeStep={activeStep} >
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {load1 && <CircularProgress size={40} sx={{ ml: '50%' }} color='inherit' />}
          {!load1 && (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={7} sx={{ paddingTop: 7 }}>
                {activeStep === 0 && (
                  <>
                    <Grid item xs={12} sx={{marginBottom: 3}}>
                      <Box className='d-sm-block' sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('service_name')}
                        placeholder={t('service_name_placeholder')+''}
                        name='service_name'
                        value={formData.service_name}
                        onChange={handleInputChange}
                        required
                        error={Boolean(errors.service_name)}
                        helperText={errors.service_name}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('description')}
                        placeholder={t('description_placeholder')+''}
                        name='description'
                        multiline
                        rows={4}
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        error={Boolean(errors.description)}
                        helperText={errors.description}
                      />
                    </Grid>

                    {shops.length && (
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <MultipleSelectChip
                            isCity
                            list={shops}
                            values={selectedShops}
                            setValues={setSelectedShops}
                            name={t('shops') + ''}
                            required={true}
                          />
                        </FormControl>
                      </Grid>
                    )}

                    <Grid item sm={6} xs={12}>
                      <Autocomplete
                        fullWidth
                        disablePortal
                        placeholder={t('service_owner')+''}
                        onChange={(event: any, newValue: null|string) => {setIsMyService(newValue === 'Fonctionement interne' || newValue === null)}}
                        options={['Fonctionement interne', 'Partenaire externe']}
                        renderInput={(params) => <TextField {...params} placeholder={t('service_owner_placeholder')+''} />}
                      />
                    </Grid>

                    {!isMyService && (
                      <>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label={t('email')}
                            placeholder={t('email_placeholder')+''}
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
                          <Grid item xs={12}>
                            <FormControl fullWidth>
                              <InputLabel htmlFor='account-settings-confirm-new-password'>{t('password')}</InputLabel>
                              <OutlinedInput
                                label={t('password')}
                                value={formData.pass}
                                id='account-settings-confirm-new-password'
                                type={show ? 'text' : 'password'}
                                onChange={handleInputChange}
                                name='pass'
                                required={!isMyService}
                                error={!isValid && formData.pass != ''}
                                endAdornment={
                                  <InputAdornment position='end'>
                                    <IconButton
                                      edge='end'
                                      aria-label='toggle password visibility'
                                      onClick={() => setShow(!show)}
                                      onMouseDown={() => setShow(!show)}
                                    >
                                      {show ? <EyeOutline /> : <EyeOffOutline />}
                                    </IconButton>
                                  </InputAdornment>
                                }
                              />
                            </FormControl>
                          </Grid>
                          <Grid item xs={12}>
                            {formData.pass && !isError && !isSuccess && (
                              <ReactPasswordChecklist
                                rules={['minLength']}
                                minLength={6}
                                value={formData.pass}
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
                          </Grid>{' '}
                        </Grid>
                      </>
                    )}
                    <Grid item xs={12}>
                      <Grid container spacing={6} style={{padding: 10}}>
                        <Grid item xs={12}>
                          <Typography
                            variant='h4'
                          >
                            {t('select_adress')}
                          </Typography>
                        </Grid>
                        {adress.map((a, i) => 
                          <SelectZones 
                            key={i}  
                            a={a} 
                            i={i} 
                            adress={adress} 
                            setAdress={setAdress} 
                            removeAdress={removeAdress} 
                            t={t} 
                            isTarif={false}
                          />
                        )} 
                        <Grid item xs={12}>
                          <Button
                            onClick={() => 
                              setAdress([
                                ...adress, 
                                {
                                  country: activeShop?.country, 
                                  city: activeShop?.city, 
                                  adress: ''
                                }
                            ])}
                            variant='contained'
                          >
                            {t('add_address')}
                          </Button>
                        </Grid>
                    </Grid>
                    </Grid>
                  </>
                )}

                    
                        
                       
                    

                  
                {activeStep === 1 && (
                  <>
                    {listTarif.map((a, i) => 
                        <SelectZones 
                          a={a} 
                          i={i} 
                          key={i}
                          adress={listTarif} 
                          setAdress={setListTarif} 
                          removeAdress={removeTarif} 
                          t={t}
                          isTarif={true}
                        />
                      )}

                      <Grid item xs={12}>
                        <Button
                          onClick={() => 
                            setListTarif([
                              ...listTarif, 
                              {
                                country: activeShop?.country, 
                                city: activeShop?.city, 
                                zone: [], 
                                tarif: 0
                              }]
                          )}
                          variant='contained'
                        >
                          {t('add_tarif_zone')}
                        </Button>
                      </Grid>
                    </>
                )}
                
                
                <Grid item xs={12}>
                  {isError && (
                    <Alert severity='error' sx={{ mb: 4 }}>
                      {t(errorType)}
                    </Alert>
                  )}
                  {isSuccess && (
                    <Alert severity='success' sx={{ mb: 4 }}>
                      {t(activeStep === 0 ? 'service_company_created' : 'pricing_created_success')}
                    </Alert>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Button
                    disabled={!isMyService && formData.pass && !isValid ? true : false}
                    variant='contained'
                    sx={{ marginRight: 3.5 }}
                    type="submit"
                  >
                    {t(activeStep < 1 ? 'next_step' : 'add')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
                  </Button>
                </Grid>
              </Grid>
            </form>
          )}
        </CardContent>
      </Card>
    </Grid>
  )
}

export default AccountSettings
