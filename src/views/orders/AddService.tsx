import * as React from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useTranslation } from 'react-i18next'
import { CircularProgress, FormControl, InputLabel, MenuItem, Select } from '@mui/material'

interface AddServiceProps {
  open: boolean
  setOpen: (type: boolean) => void
  handleAddService: (val: any, id: string, email: any) => void
  services: any
}

const AddService: React.FC<AddServiceProps> = ({ open, setOpen, handleAddService, services }) => {
  const { t } = useTranslation('order')
  const [load, setLoad] = React.useState(false)
  const handleClose = () => {
    setOpen(false)
    setLoad(false)
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
          setLoad(true)
          const formData = new FormData(event.currentTarget)
          const service = services.find(item => item?.deliveryService?._id == formData.get('deliveryService'))
          handleAddService(
            service?.deliveryService?._id,
            service.deliveryService?.user?._id,
            service.deliveryService?.user?.companyEmail || service.deliveryService?.user?.email
          )
          handleClose()
        }
      }}
    >
      <DialogTitle>{t('sent_to_deliver')}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 3 }}>
          <InputLabel>{t('service_modal_title')}</InputLabel>
          <Select
            label={t('service_modal_title')}
            placeholder={`${t('service_modal_title')}`}
            name='deliveryService'
            required
          >
            {services?.map((customer: any) => {
              return (
                <MenuItem key={customer?._id} value={customer?.deliveryService?._id}>
                  {customer?.deliveryService?.name} ({customer?.deliveryService?.user?.companyName})
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('cancel')}</Button>
        <Button type='submit'>
          {t('save')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddService
