// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Select from '@mui/material/Select'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import InputLabel from '@mui/material/InputLabel'
import CardContent from '@mui/material/CardContent'
import FormControlLabel from '@mui/material/FormControlLabel'

// ** Third Party Imports
import { registerLocale } from 'react-datepicker'

// ** Styled Components
import { Autocomplete, Box, Card, CardHeader, Chip, CircularProgress, Switch, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import fr from 'date-fns/locale/es'
import { createProduct, generateDescription, getProductById, updateProduct } from 'src/@apiCore/npoints'
import { toast } from 'react-toastify'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import FileUploader from 'src/@core/components/file-upload'
import { useRouter } from 'next/router'

registerLocale('fr', fr)

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['product', 'common']))
    }
  }
}

const CreateProduct = () => {
  // ** State
  const { activeShop, user } = useGlobalContext()
  const [files, setFiles] = useState<File[]>([])
  const [isNegociable, setIsNegociable] = useState(false)
  const [load, setLoad] = useState(false)
  const [loadAuto, setLoadAuto] = useState(false)
  const [inStock, setInStock] = useState(true)
  const [link, setLink] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [command, setCommand] = useState('')
  const [quantity, setQuantity] = useState('')
  const [product, setProduct] = useState<any>(null)
  const { t, i18n } = useTranslation('product')
  const [images, setImages] = useState([])
  const router = useRouter()
  const { id }: any = router.query
  const [load1, setLoad1] = useState(id !== undefined)

  const handleSubmit = async (event: any) => {
    event.preventDefault()
    const data = new FormData(event.target)
    setLoad(true)
    if (files.length > 0)
      files.forEach((file, index) => {
        data.append(`images[${index}]`, file)
      })
    data.append('user', user?._id)
    data.append('shop', activeShop?._id)
    data.append('socialLinks', link)
    data.append('isNegociable', isNegociable ? '1' : '0')
    data.append('in_stock', inStock ? '1' : '0')
    createProduct(data)
      .then(response => {
        if (response.status == 201) {
          toast.success(t('success'))
          router.back()
        } else toast.error(t('error'))
      })
      .catch(() => toast.error(t('error')))
      .finally(() => setLoad(false))
  }

  const autoDescription = () => {
    if (!name) {
      toast.error(t('required_name'))

      return
    }
    setLoadAuto(true)

    const context = `
    Génère pour ce produit de ma boutique une description détaillé tout en ressortisant les caractéristiques et avantage:
    Nom du produit: ${name}
    Language de description: ${i18n.language}
    `
    generateDescription(context)
      .then(res => {
        setDescription(res.data.completion.message.content)
      })
      .catch(err => console.log(err))
      .finally(() => setLoadAuto(false))
  }

  const handleUpdate = async (event: any) => {
    event.preventDefault()
    const data = new FormData(event.target)
    setLoad(true)
    if (files.length > 0)
      files.forEach((file, index) => {
        data.append(`images[${index}]`, file)
      })
    data.append('user', user?._id)
    data.append('shop', activeShop?._id)
    data.append('socialLinks', link)
    data.append('isNegociable', isNegociable ? '1' : '0')
    data.append('in_stock', inStock ? '1' : '0')
    data.append('lastImages', images.toString())

    updateProduct(id, data)
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
      getProductById(id)
        .then(response => {
          if (response.status == 200) {
            const data = response.data.data
            if (data) {
              setName(data.name)
              setDescription(data.description)
              setIsNegociable(data.isNegotiable)
              setInStock(data.in_stock)
              setQuantity(data.quantity)
              setImages(data.images)
              setLink(data.socialLinks)
              setCommand(data.command)
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
          <Grid item xs={12} sm={7}>
            <Card>
              <CardHeader title={t('section1_title')} />
              <CardContent>
                <Grid>
                  <InputLabel sx={{ mb: 3 }}>{t('name')}</InputLabel>
                  <TextField
                    required
                    fullWidth
                    type='text'
                    name='name'
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </Grid>
                <Grid mt={5}>
                  <InputLabel sx={{ mb: 3 }}>{t('category')}</InputLabel>
                  <Select fullWidth name='category' defaultValue={`${product?.category}`}>
                    {activeShop?.categories.map((item: any) => (
                      <MenuItem key={item._id} value={item?._id}>
                        {item[i18n.language]}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid mt={5}>
                  <Grid item xs={12} sx={{ mb: 3 }} display={'flex'} justifyContent={'space-between'}>
                    <InputLabel>{t('description')}</InputLabel>

                    <Button
                      onClick={autoDescription}
                      size='small'
                      variant='contained'
                      sx={{ textTransform: 'initial' }}
                    >
                      {t('generate_ai')} {loadAuto && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
                    </Button>
                  </Grid>
                  <TextField
                    rows={4}
                    name='description'
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    fullWidth
                    multiline
                    label=''
                    placeholder={t('description_placeholder') + ''}
                    required
                  />
                </Grid>
                <Grid mt={5}>
                  <Grid item xs={12} sx={{ mb: 3 }} display={'flex'} justifyContent={'space-between'}>
                    <InputLabel>{t('command')}</InputLabel>

                  </Grid>
                  <TextField
                    name='command'
                    value={command}
                    onChange={e => setCommand(e.target.value)}
                    fullWidth
                    multiline
                    label=''
                    placeholder={'ex: /Gourde'}
                    required
                  />
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mt: 10 }}>
              <CardHeader title={t('media')} />
              <CardContent>
                <FileUploader files={files} setFiles={setFiles} setImages={setImages} images={images} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={5}>
            <Card>
              <CardHeader title={t('pricing')} />
              <CardContent>
                <Grid>
                  <InputLabel sx={{ mb: 3 }}>{t('base_price')}</InputLabel>
                  <TextField fullWidth defaultValue={product?.price} type='number' name='price' required />
                </Grid>
                <Grid mt={5}>
                  <InputLabel sx={{ mb: 3 }}>{t('discount_price')}</InputLabel>
                  <TextField fullWidth type='number' defaultValue={product?.discountPrice} name='discountPrice' />
                </Grid>
                <Grid mt={5}>
                  <FormControlLabel
                    control={
                      <Switch checked={isNegociable} onChange={() => setIsNegociable(!isNegociable)} color='success' />
                    }
                    label={t('is_negociable')}
                  />
                </Grid>
                {isNegociable && (
                  <Grid mt={5}>
                    <InputLabel sx={{ mb: 3 }}>{t('negociation_price')}</InputLabel>
                    <TextField
                      defaultValue={product?.negotiablePrice}
                      required
                      fullWidth
                      type='number'
                      name='negotiablePrice'
                    />
                  </Grid>
                )}
              </CardContent>
            </Card>

            <Card sx={{ mt: 10 }}>
              <CardHeader title={t('stock')} />
              <CardContent>
                <Grid>
                  <FormControlLabel
                    control={<Switch checked={inStock} onChange={() => setInStock(!inStock)} color='success' />}
                    label={t('in_stock')}
                  />
                </Grid>
                <Grid mt={5}>
                  <InputLabel sx={{ mb: 3 }}>{t('quantity')}</InputLabel>
                  <TextField
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    required
                    fullWidth
                    type='number'
                    name='quantity'
                  />
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mt: 10 }}>
              <CardHeader title={t('link')} />
              <CardContent>
                <Typography variant='body2' sx={{ mb: 3 }}>
                  {t('product_link')}
                </Typography>
                <Autocomplete
                  freeSolo
                  multiple
                  id='autocomplete-multiple-filled'
                  defaultValue={product?.socialLinks?.split(',') || []}
                  options={[]}
                  renderInput={params => <TextField {...params} type='url' placeholder={t('link') + ''} rows={5} />}
                  renderTags={(value: string[], getTagProps) => {
                    setLink(value.toString())

                    return value.map((option: string, index: number) => (
                      <Chip
                        variant='outlined'
                        label={option}
                        size='small'
                        {...(getTagProps({ index }) as {})}
                        key={index}
                      />
                    ))
                  }}
                />
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

export default CreateProduct
