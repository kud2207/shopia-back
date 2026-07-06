import { useState } from 'react'
import { Card, CardContent, CardMedia, Typography, Button, Box } from '@mui/material'
import { Phone, Mail, PriceCheck, Verified } from '@mui/icons-material'
import PricingModal from './PricingModal'
import { DeliveryServiceInterface } from 'src/types'

interface DeliveryServiceCardProps {
  service: DeliveryServiceInterface
}

const DeliveryServiceCard = ({ service }: DeliveryServiceCardProps) => {
  const [isPricingOpen, setIsPricingOpen] = useState(false)
  const defaultImage = 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&auto=format&fit=crop'
  
  return (
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.05)'
          }
        }}
      >
        <CardMedia
          component='img'
          height='200'
          image={service.logo || defaultImage}
          alt={service.name}
          sx={{
            objectFit: 'cover'
          }}
        />
        <CardContent
          sx={{
            flexGrow: 1,
            p: 3,
            backgroundColor: '#FFFFFF'
          }}
        >
          <Typography
            gutterBottom
            variant='h5'
            component='h2'
            sx={{
              color: '#374151',
              fontWeight: '500',
              mb: 2,
              display: "flex",
              alignItems: "center",
              gap: 2
            }}
          >
            {service.name} <Verified sx={{color: "#048dd6"}} />
          </Typography>
          <Typography
            variant='body2'
            sx={{
              color: '#6B7280',
              mb: 3,
              lineHeight: 1.6
            }}
            paragraph
          >
            {service.description}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography
              variant='body2'
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 1,
                color: '#6B7280'
              }}
            >
              <Phone sx={{ mr: 1, fontSize: 20, color: '#9CA3AF' }} />
              {service?.phone}
            </Typography>
            <Typography
              variant='body2'
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 2,
                color: '#6B7280'
              }}
            >
              <Mail sx={{ mr: 1, fontSize: 20, color: '#9CA3AF' }} />
              {service?.email}
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<PriceCheck />}
            fullWidth
            onClick={() => setIsPricingOpen(true)}
            sx={{
              mt: 'auto'
            }}
          >
            Voir la grille tarifaire
          </Button>
        </CardContent>
      </Card>

      <PricingModal
        open={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        zonePricing={service.pricings}
        serviceName={service.name}
      />
    </>
  )
}

export default DeliveryServiceCard
