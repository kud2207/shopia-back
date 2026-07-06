import * as React from 'react'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { useTranslation } from 'react-i18next'

interface AddPriceProps {
  open: boolean
  setOpen: (type: boolean) => void
  handleAddPrice: (price: number) => void
}

const AddPrice: React.FC<AddPriceProps> = ({ open, setOpen, handleAddPrice }) => {
  const { t } = useTranslation('order')

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <Dialog
      maxWidth='sm'
      fullWidth
      open={open}
      onClose={handleClose}
      PaperProps={{
        component: 'form',
        onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          const formJson = Object.fromEntries((formData as any).entries())
          const price = formJson.price
          handleAddPrice(price)
          handleClose()
        }
      }}
    >
      <DialogTitle>{t('price_modal_title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('subprice_text')}</DialogContentText>
        <TextField
          autoFocus
          required
          margin='dense'
          id='name'
          name='price'
          label={t('delivery_price')}
          type='number'
          fullWidth
          variant='standard'
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('cancel')}</Button>
        <Button type='submit'>{t('save')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddPrice
