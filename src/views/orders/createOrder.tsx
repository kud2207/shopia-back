import * as React from 'react'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { Add } from '@mui/icons-material'
import { FormControl, Grid, InputLabel, MenuItem, Select } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { getCustomers, getProducts } from 'src/@apiCore/npoints'
import { useGlobalContext } from 'src/@core/context/globalContext'

interface CreateOrderProps {
  setOpen: (val: boolean) => void
  open: boolean
}

export default function CreateOrder({ setOpen, open }: CreateOrderProps) {
  const [formData, setFormData] = React.useState({
    customer: '',
    product: '',
    date: new Date().toISOString().split('T')[0]
  })
  const { t, i18n } = useTranslation('order')
  const [products, setProducts] = React.useState([])
  const [customers, setCustomers] = React.useState([])
  const { activeShop } = useGlobalContext()

  // Handle input change
  const handleInputChange = (event: any) => {
    const { name, value } = event.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  React.useEffect(() => {
    if (activeShop)
      getProducts(activeShop?._id, "")
        .then(response => {
          if (response.data.success) {
            setProducts(response.data.data)
          }
        })
        .catch(err => {
          console.log(err)
        })
  }, [activeShop])

  React.useEffect(() => {
    getCustomers()
      .then(response => {
        if (response.data.success) {
          setCustomers(response.data.data)
        }
      })
      .catch(err => {
        console.log(err)
      })
  }, [])

  return (
    <React.Fragment>
      <Button
        startIcon={<Add />}
        onClick={() => setOpen(true)}
        size='medium'
        variant='contained'
        sx={{ textTransform: 'initial' }}
      >
        {t('new_order')}
      </Button>
      <Dialog
        open={open}
        maxWidth='sm'
        fullWidth
        onClose={() => setOpen(false)}
        PaperProps={{
          component: 'form',
          onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            const formJson = Object.fromEntries((formData as any).entries())
            const email = formJson.email
            console.log(email)
            setOpen(false)
          }
        }}
      >
        <DialogTitle> {t('new_order')}</DialogTitle>
        <DialogContent>
          <form>
            <Grid mt={-4} container spacing={7}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('product')}</InputLabel>
                  <Select
                    label={t('product')}
                    placeholder={`${t('product')}`}
                    value={formData.product}
                    onChange={handleInputChange}
                    name='product'
                  >
                    {products?.map((product: any) => {
                      return (
                        <MenuItem key={product?._id} value={product._id}>
                          {product[i18n.language] || product.en}
                        </MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('customer')}</InputLabel>
                  <Select
                    label={t('customer')}
                    placeholder={`${t('customer')}`}
                    value={formData.customer}
                    onChange={handleInputChange}
                    name='customer'
                  >
                    {customers?.map((customer: any) => {
                      return (
                        <MenuItem key={customer?._id} value={customer._id}>
                          {customer?.name}
                        </MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('date')}
                  placeholder='example@gmail.com'
                  name='date'
                  type='date'
                  value={formData.date}
                  defaultValue={new Date().toISOString().split('T')[0]} // Format: YYYY-MM-DD
                  onChange={handleInputChange}
                  required
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('cancel')}</Button>

          <Button variant='contained' type='submit'>
            {t('create')}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  )
}
