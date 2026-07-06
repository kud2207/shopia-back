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
import AlertTitle from '@mui/material/AlertTitle'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import Button, { ButtonProps } from '@mui/material/Button'

// ** Icons Imports
import { useTranslation } from 'react-i18next'
import swal from 'sweetalert'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { generateDescription, getCategories, getCurrecncies, updateShop } from 'src/@apiCore/npoints'
import { useRouter } from 'next/router'
import { MuiPhone } from 'src/@core/components/phone-tel'
import { CircularProgress } from '@mui/material'
import MultipleSelectChip from 'src/@core/components/multi-select'
import CountryAndCity from './CountryAndCity'

const ImgStyled = styled('img')(({ theme }) => ({
  width: 120,
  height: 120,
  marginRight: theme.spacing(6.25),
  borderRadius: theme.shape.borderRadius,
  objectFit: 'cover'
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

const TabGeneral = () => {
  const { t, i18n } = useTranslation('shop')
  const { activeShop, setActiveShop, shops, setShops } = useGlobalContext()!
  const router = useRouter()
  const [load, setLoad] = useState(false)
  const [categories, setCategories] = useState([])
  const [listCategory, setListCategory] = useState([])
  const [file, setFile] = useState<FileList | null>(null)
  const [loadAuto, setLoadAuto] = useState(false)
  const [currencies, setCurrencies] = useState([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    city: '',
    country: '',
    imgSrc: '',
    address: '',
    phone: '',
    currency: ''
  })

  const [errors, setErrors] = useState({
    name: '',
    phone: ''
  })

  useEffect(() => {
    setFormData({
      name: activeShop?.name || '',
      description: activeShop?.description || '',
      city: activeShop?.city || '',
      country: activeShop?.country || '',
      imgSrc: activeShop?.logo || '/images/avatars/shop.png',
      address: activeShop?.address || '',
      phone: activeShop?.phone || '',
      currency: activeShop?.currency || ''
    })
    setCategories(activeShop?.categories || [])
  }, [activeShop])

  useEffect(() => {
    getCategories()
      .then(response => {
        if (response.data.success) {
          setListCategory(response.data.data)
        }
      })
      .catch(err => {
        console.log(err)
      })
    getCurrecncies()
      .then(response => {
        if (response.data.success) {
          setCurrencies(response.data.data)
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

  const handleDelete = () => {
    swal({
      title: '',
      text: t('delete_text') + '',
      icon: 'error',
      buttons: [t('cancel') + '', t('delete') + ''],
      dangerMode: true
    }).then(willDelete => {
      if (willDelete) {
        const data = new FormData()
        data.append('isDelete', '1')
        updateShop(activeShop._id, data)
          .then(response => {
            if (response.status == 200) {
              if (shops.length == 1) {
                setShops([])
                setActiveShop(null)
                router.push('/shop/create')
              } else {
                const arrShops = shops.filter((item: any) => item._id != activeShop._id)
                setShops(arrShops)
                setActiveShop(arrShops[0])
                localStorage.setItem('shops', JSON.stringify(arrShops))

                router.push('/app')
              }
              swal('', t('delete_success') + '', 'success')
            }
          })
          .catch(error => {
            console.log(error)
          })
      }
    })
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
    setLoad(true)
    const formValues = new FormData(event.target)
    if (file) {
      formValues.append('file', file[0])
    }

    formValues.append('name', formData.name)
    formValues.append('description', formData.description)
    formValues.append('phone', formData.phone)
    formValues.append('address', formData.address)
    formValues.append('logo', formData.imgSrc)
    formValues.append('currency', formData.currency)
    formValues.append('categories', JSON.stringify(categories.map((category: any) => category._id)))
    updateShop(activeShop._id, formValues)
      .then(response => {
        setLoad(false)
        if (response.data) {
          setActiveShop(response.data.shop)
          setShops(shops.filter((val: any) => val._id != activeShop._id).concat([response.data.shop]))
          localStorage.setItem('shops', JSON.stringify(shops.filter((val: any) => val._id != activeShop._id).concat([response.data.shop])))
          swal('', t('shop_updated') + '', 'success')
        }
      })
      .catch(error => {
        setLoad(false)
        console.log(error)
      })
  }

  const resetProfileImage = () => {
    setFile(null)

    setFormData({ ...formData, imgSrc: '/images/avatars/shop.png' })
  }

  const autoDescription = () => {
    setLoadAuto(true)
    const context = `
    Génère pour cette boutique une description en 500 carractères maximum:
Nom de la Boutique: ${formData.name}
Catégories de Produits vendu: ${categories.map((category: any) => category.label).toString()}
Language de description: ${i18n.language}
    `
    generateDescription(context)
      .then(res => {
        setLoadAuto(false)
        setFormData({
          ...formData,
          description: res.data.completion.message.content
        })
      })
      .catch(err => console.log(err))
  }

  return (
    <CardContent>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={7}>
          <Grid item xs={12} sx={{ marginTop: 4.8, marginBottom: 3 }}>
            <Box className='d-sm-block' sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImgStyled src={formData.imgSrc} alt='Shop profile' />
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

          <Grid item xs={12} sm={12}>
            <TextField
              fullWidth
              label={t('name')}
              placeholder={`${t('name')}`}
              name='name'
              value={formData.name}
              onChange={handleInputChange}
              required
              error={Boolean(errors.name)}
              helperText={errors.name}
            />
          </Grid>
          <Grid item xs={12} display={'flex'} justifyContent={'flex-end'}>
            <Button onClick={autoDescription} size='small' variant='contained' sx={{ textTransform: 'initial' }}>
              {t('generate_ai')} {loadAuto && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
          </Grid>
          <Grid item xs={12} sx={{ marginTop: -4 }}>
            <TextField
              fullWidth
              multiline
              label={t('description')}
              name='description'
              minRows={2}
              maxRows={5}
              value={formData.description}
              placeholder={`${t('description')}`}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <MultipleSelectChip isCity={false} list={listCategory} values={categories} setValues={setCategories} />
            </FormControl>
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
          <CountryAndCity sm={6} defaultCountry={formData.country} defaultCity={formData.city} />
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('address')}
              placeholder={`${t('address')}`}
              name='address'
              value={formData.address}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('slogan')}</InputLabel>
              <Select
                label={t('slogan')}
                placeholder={`${t('slogan')}`}
                value={formData.currency}
                onChange={handleInputChange}
                name='currency'
                fullWidth
                id='currency' 
              >
                {currencies?.map((val: any) => {
                  return (
                    <MenuItem key={val?._id} value={val.code}>
                      {val[i18n.language] || val.en} ({val.code})
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Button type='submit' variant='contained' sx={{ marginRight: 3.5 }}>
              {t('save')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
          </Grid>
        </Grid>
      </form>
      <Box mt={20}>
        <Alert severity='error' variant='outlined' sx={{ '& a': { fontWeight: 400 } }}>
          <AlertTitle>{t('delete_shop_title')}</AlertTitle>
          {t('delete_text')} <br />
          <Button color='error' onClick={handleDelete} variant='contained' sx={{ marginRight: 3.5, mt: 10 }}>
            {t('delete_shop')}
          </Button>
        </Alert>
      </Box>
    </CardContent>
  )
}

export default TabGeneral
