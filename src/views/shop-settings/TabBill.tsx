import { Alert, Avatar, Box, Button, CircularProgress, Divider, Grid, TextField, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { getInvoiceByIdShop, postInvoice } from 'src/@apiCore/npoints'
import swal from 'sweetalert'
import { useTranslation } from 'react-i18next'

interface invoiceForm {
  salesPerson: string
  thanksgiving: string
  note: string
}

export const TabBill = () => {
  const [form, setForm] = useState<invoiceForm>({
    salesPerson: '',
    thanksgiving: '',
    note: ''
  })
  const [error, setError] = useState<boolean>(false)
  const [serverMsg, setServerMsg] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const { activeShop, user } = useGlobalContext()!

  const { t } = useTranslation('shop')

  useEffect(() => {
    if (activeShop._id) {
      getInvoiceByIdShop(activeShop._id)
        .then((response: any) => {
          if (response.status == 200) {
            setForm({
              salesPerson: response.data.data.salerPersone,
              thanksgiving: response.data.data.thanksgiving,
              note: response.data.data.note
            })
          }
        })
        .catch(() => {
          /** */
        })
    }
  }, [activeShop._id])

  const handlePostInvoice = () => {
    setLoading(true)
    setServerMsg('')
    setError(false)
    if (!form.thanksgiving || !form.note || !activeShop._id || !user?._id) {
      setError(true)
      setServerMsg(t('error_on_invoice_field_unfilled') || '')
      setLoading(false)
    } else {
      postInvoice({ ...form, shopId: activeShop._id, userId: user?._id })
        .then(response => {
          setLoading(false)
          if (response.status == 200) {
            swal('', t(response.data.message) + '', 'success')
          } else {
            swal('', t(response.data.message) + '', 'error')
          }
        })
        .catch(err => {
          setError(true)
          setServerMsg(err.message)
          setLoading(false)
        })
    }
  }

  const handleChange = (e: any) => {
    setForm((init: invoiceForm) => {
      return {
        ...init,
        [e.target.name]: e.target.value
      }
    })
  }

  return (
    <Box width={'100%'} padding={2}>
      <Box mt={5}>
        <Typography variant='h6'> {t('edit_invoice_title')}</Typography>
        <Typography variant='body2'>{t("edit_invoice_text")}</Typography>
      </Box>

      <Grid className='d-sm-none' container display={'flex'} flexDirection={'row'} justifyContent={'space-between'}>
        <Grid item sm={8} xs={12}  display={'flex'} flexDirection={'column'} padding={10}>
          <Avatar style={{ marginBottom: 10, width: '100px', height: '100px', borderRadius: 10 }} src={activeShop.logo}>
            N
          </Avatar>
          <Box>{activeShop.name}</Box>
          <Box>
            {activeShop.address}
          </Box>
          <Box>{activeShop.phone}</Box>
        </Grid>
        <Grid sm={4} xs={12} padding={5}>
          <Box mb={2}>
            <Box>Date: 2024-02-08</Box>
          </Box>
          <Box display={'flex'} flexDirection={'column'}>
            <Box mb={2}>{t('invoice_to')}</Box>
            <Box>Thomas shelby</Box>
            <Box>Shelby Company Limited</Box>
            <Box>Small Heath, B10 0HF, UK</Box>
            <Box>718-986-6062</Box>
            <Box>peakyFBlinders@gmail.com</Box>
          </Box>
        </Grid>
      </Grid>
      <Divider className='d-sm-none' />
      <Box className='d-sm-none' display={'flex'} padding={2} flexDirection={'column'} justifyContent={'center'} width={'100%'}>
        <Box sx={{ flexGrow: 1 }} mb={4} borderBottom={'1px solid gray'}>
          <Grid container spacing={3}>
            <Grid xs={4} textAlign={'center'}>
              {t('Items')}
            </Grid>
            <Grid xs={3} textAlign={'center'}>
              {t('Costs')}
            </Grid>
            <Grid xs={3} textAlign={'center'}>
              {t('Quantity')}
            </Grid>
            <Grid xs={2} textAlign={'center'}>
              {t('Price')}
            </Grid>
          </Grid>
        </Box>
        <Box sx={{ flexGrow: 1 }} mb={4} borderBottom={'1px solid gray'}>
          <Grid container spacing={3}>
            <Grid textAlign={'center'} xs={4}>
              <Box>Nom produit 1</Box>
            </Grid>
            <Grid xs={3} textAlign={'center'}>
              100
            </Grid>
            <Grid xs={3} textAlign={'center'}>
              10
            </Grid>
            <Grid xs={2} textAlign={'center'}>
              1000
            </Grid>
          </Grid>
        </Box>
        <Box sx={{ flexGrow: 1 }} mb={3} borderBottom={'1px solid gray'}>
          <Grid container spacing={3}>
            <Grid textAlign={'center'} xs={4}>
              <Box>Nom produit 2</Box>
            </Grid>
            <Grid xs={3} textAlign={'center'}>
              4000
            </Grid>
            <Grid xs={3} textAlign={'center'}>
              1
            </Grid>
            <Grid xs={2} textAlign={'center'}>
              4000
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Divider className='d-sm-none'/>
      <Grid container justifyContent={'space-between'}>
        <Grid className='d-sm-p-10' mt={2} item sm={8} xs={12} display={'flex'} flexDirection={'column'} padding={10}>
          <Box>
            <TextField
              size='small'
              id='outlined-basic'
              label={t('thanks_giving_label')}
              value={form.thanksgiving}
              name='thanksgiving'
              onChange={handleChange}
              variant='outlined'
            />
          </Box>
        </Grid>
        <Grid className='d-sm-none' item sm={4} xs={12} padding={5}>
          <Box mb={5} display={'flex'} flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
            <Box>{t('subtotal')}</Box>
            <Box>5 000 {activeShop.currency}</Box>
          </Box>
          <Box mb={5} display={'flex'} flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
            <Box>{t('Discount')}</Box>
            <Box>00.00</Box>
          </Box>
          <Divider />
          <Box display={'flex'} flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
            <Box>{t('Total')}</Box>
            <Box>5 000 {activeShop.currency} </Box>
          </Box>
        </Grid>
      </Grid>
      <Divider className='d-sm-none' />
      <Box className='d-sm-p-10' padding={10}>
        <Box>{t('Note')}</Box>
        <br />
        <TextField
          id='outlined-multiline-static'
          multiline
          minRows={2}
          maxRows={10}
          fullWidth
          value={form.note}
          name='note'
          onChange={handleChange}
          label={''}
          sx={{ marginBottom: 4 }}
        />
        <Box padding={3}>{error && <Alert severity='error'>{serverMsg}</Alert>}</Box>
      </Box>
      <Divider className='d-sm-none'/>
      <Box className='d-sm-p-10' padding={10} display={'flex'} flexDirection={'row'} justifyContent={'end'}>
        <Button onClick={handlePostInvoice}>
          {t('save_invoice')} {loading && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
        </Button>
      </Box>
    </Box>
  )
}
