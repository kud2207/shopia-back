import * as React from 'react'
import { styled } from '@mui/material/styles'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Collapse from '@mui/material/Collapse'
import Avatar from '@mui/material/Avatar'
import IconButton, { IconButtonProps } from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import PhoneIcon from '@mui/icons-material/Phone'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useTranslation } from 'react-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { Box, Button, Grid } from '@mui/material'
import Link from 'next/link'
import ServiceList from './ServiceList'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['shop']))
    }
  }
}
interface ExpandMoreProps extends IconButtonProps {
  expand: boolean
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { ...other } = props

  return <IconButton {...other} />
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest
  })
}))

export default function CompanyItem(props: any) {
  const [expanded, setExpanded] = React.useState(false)
  const { item } = props
  const { t } = useTranslation('shop')
  const [shops, setShops] = React.useState(item.shops || [])

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  const calculatePriceRange = (services: any[]) => {
    if (!services || services.length === 0) {
      return 'Pas de données disponibles'
    }

    // Trouver le prix minimum et maximum
    let minPrice = services[0].minPrice
    let maxPrice = services[0].maxPrice

    for (const service of services) {
      if (service.minPrice < minPrice) {
        minPrice = service.minPrice
      }

      if (service.maxPrice > maxPrice) {
        maxPrice = service.maxPrice
      }
    }

    // Renvoyer la fourchette de prix sous forme de chaîne
    return `${minPrice} - ${maxPrice} ${services[0].currency}`
  }

  const getUniqueCityNames = (cities: any[]) => {
    if (!cities || cities.length === 0) {
      return ''
    }

    // Utiliser un ensemble (Set) pour stocker les noms de ville uniques
    const uniqueCityNames = new Set()

    for (const city of cities) {
      uniqueCityNames.add(city.name)
    }

    // Convertir l'ensemble en tableau et renvoyer la liste des noms de ville
    return Array.from(uniqueCityNames).join(', ')
  }

  return (
    <Card sx={{ marginTop: 5 }}>
      <CardHeader
        avatar={
          <Avatar src={item.logo || item.image} aria-label='recipe'>
            R
          </Avatar>
        }
        title={item?.companyName || item.name}
        subheader={item?.companyEmail || item.email}
      />
      <CardContent>
        <Box className="d-sm-block" display={'flex'}>
          <Typography variant='body1' color='text.secondary'>
            {t('total_service')} : {item?.services.length}
          </Typography>
          {item?.services.length && (
            <>
              <Typography variant='body1' className="d-sm-ml-0" ml={3} color='text.secondary'>
                {t('price_range')}: {calculatePriceRange(item?.services)}
              </Typography>

              <Typography variant='body1' className="d-sm-ml-0" ml={3} color='text.secondary'>
                {t('service_in')}: {getUniqueCityNames(item.cityDetails)}
              </Typography>
            </>
          )}
        </Box>
      </CardContent>
      <CardActions className="d-sm-block" disableSpacing sx={{ marginTop: -4 }}  >
        <Button onClick={handleExpandClick}>
          {t('view_service')}
          <ExpandMore color='primary' expand={expanded} aria-expanded={expanded} aria-label='show more'>
            <ExpandMoreIcon />
          </ExpandMore>
        </Button>
        <Grid className="d-sm-block" display={'flex'} flex={1} justifyContent={'flex-end'}>
          <Link href={'tel:' + item.phone}>
            <Button>
              <PhoneIcon sx={{ mr: 2 }} /> {t('call')}
            </Button>
          </Link>
          <Link href={'https://wa.me/' + item.companyPhone}>
            <Button aria-label='share' color='success'>
              <WhatsAppIcon sx={{ mr: 2 }} /> {t('writte_whatsapp')}
            </Button>
          </Link>
        </Grid>
      </CardActions>
      <Collapse in={expanded} timeout='auto' unmountOnExit>
        <CardContent sx={{ marginTop: -8 }}>
          <Typography variant='h6'>{t('services')}</Typography>
          <Typography variant='body2' mb={4}>
            {t('services_text')}
          </Typography>
          <ServiceList data={item.services} cities={item.cityDetails} shops={shops} setShops={setShops} {...props} />
        </CardContent>
      </Collapse>
    </Card>
  )
}
