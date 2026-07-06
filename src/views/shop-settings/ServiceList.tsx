// MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ListItem from '@mui/material/ListItem'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import type { ListProps } from '@mui/material/List'
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { useState } from 'react'
import { addDeliveryServiceToShop } from 'src/@apiCore/npoints'
import { CircularProgress, Grid } from '@mui/material'
import { toast } from 'react-toastify'

const StyledList = styled(List)<ListProps>(({ theme }) => ({
  '& .MuiListItem-container': {
    border: `1px solid ${theme.palette.divider}`,
    '&:first-of-type': {
      borderTopLeftRadius: theme.shape.borderRadius,
      borderTopRightRadius: theme.shape.borderRadius
    },
    '&:last-child': {
      borderBottomLeftRadius: theme.shape.borderRadius,
      borderBottomRightRadius: theme.shape.borderRadius
    },
    '&:not(:last-child)': {
      borderBottom: 0
    },
    '& .MuiListItem-root': {
      paddingRight: theme.spacing(24)
    },
    '& .MuiListItemText-root': {
      marginTop: 0,
      '& .MuiTypography-root': {
        fontWeight: 500
      }
    }
  }
}))

const ServiceList = (props: any) => {
  const { t } = useTranslation('shop')
  const { activeShop } = useGlobalContext()
  const [load, setLoad] = useState(false)
  const [currentId, setCurrentId] = useState('')

  const shop = (serviceId: string) =>
    props.shops.find((item: any) => item.deliveryService == serviceId && item.shop == activeShop._id)

  const handleSubmit = async (serviceId: string) => {
    const data = new FormData()
    setCurrentId(serviceId)
    setLoad(true)
    data.append('shop', activeShop?._id)
    data.append('deliveryService', serviceId)

    addDeliveryServiceToShop(data)
      .then(response => {
        if (response.status == 201) {
          toast.success(t('service_added'))
          props.setShops(
            props.shops.concat([
              {
                shop: activeShop?._id,
                deliveryService: serviceId,
                status: 'waiting'
              }
            ])
          )
        } else toast.error(t('error'))
      })
      .catch(() => toast.error(t('error')))
      .finally(() => setLoad(false))
  }

  return (
    <StyledList disablePadding>
      {props.data?.map((item: any, index: number) => (
        <ListItem key={index} sx={{borderBottom: "1px solid #ddd"}}>
          <Grid container>
            <Grid item sm={10} xs={12}>
              <Box>
                <ListItemText primary={item.name} />
                <div>
                  <Typography variant='body2'>{item.description}</Typography>
                  <Box className='d-sm-block' display={'flex'}>
                    <Typography variant='body1'>
                      {t('price_range')}: {item.minPrice} {item.currency} - {item.maxPrice} {item.currency}
                    </Typography>
                    <Typography variant='body1' className='d-sm-ml-0' ml={3}>
                      {t('city')}: {props.cities?.find((val: any) => val._id == item.city).name}
                    </Typography>
                    <Typography variant='body1' className='d-sm-ml-0' ml={3}>
                      {t('delivery_zone')}: {item.deliveryZonnes.length ? item.deliveryZonnes.toString() : t('in_city')}
                    </Typography>
                  </Box>
                </div>
              </Box>
            </Grid>
            <Grid item sm={2} xs={12}>
              <Box>
                {shop(item._id) ? (
                  <Button
                    variant='text'
                    color={
                      shop(item._id).status == 'waiting'
                        ? 'warning'
                        : shop(item._id).status == 'validate'
                        ? 'success'
                        : 'error'
                    }
                    size='small'
                  >
                    {t(shop(item._id).status)}
                  </Button>
                ) : (
                  <Button variant='contained' disabled={load} size='small' onClick={() => handleSubmit(item._id)}>
                    {t('add')}{' '}
                    {load && currentId == item._id && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </ListItem>
      ))}
    </StyledList>
  )
}

export default ServiceList
