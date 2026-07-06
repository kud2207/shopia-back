import { useState, useMemo, ChangeEvent, SyntheticEvent, useEffect } from 'react'
import { Container, Grid, Typography, Box, TextField, MenuItem, TablePagination, Button, Tabs, CircularProgress } from '@mui/material'
import DeliveryServiceCard from 'src/@core/components/DeliveryServiceCard'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'react-i18next'
import { Plus } from 'mdi-material-ui'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import TabContext from '@mui/lab/TabContext'
import { styled } from '@mui/material/styles'
import MuiTab, { TabProps } from '@mui/material/Tab'
import { useRouter } from 'next/router'
import { getCitiesByCountry, getCompanyService, getCountries } from 'src/@apiCore/npoints'
import { CityInterface, CountryInterface, DeliveryServiceInterface } from 'src/types'
import { useGlobalContext } from 'src/@core/context/globalContext'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common', 'service']))
    }
  }
}
const Tab = styled(MuiTab)<TabProps>(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    minWidth: 100
  },
  [theme.breakpoints.down('sm')]: {
    minWidth: 67
  }
}))
const TabName = styled('span')(({ theme }) => ({
  lineHeight: 1.71,
  fontSize: '0.875rem',
  marginLeft: theme.spacing(2.4),
  [theme.breakpoints.down('md')]: {
    display: 'none'
  }
}))
const Index = () => {
  const { t, i18n } = useTranslation('service')

  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [countries, setCountries] = useState<CountryInterface[]>([])
  const [load, setLoad] = useState(true)
  const [service, setService] = useState<DeliveryServiceInterface[]>([])
  const [cities, setCities] = useState<CityInterface[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState<number>(5)
  const [count, setCount] = useState(0)
  const { activeShop } = useGlobalContext()
  const [activeTab, setActiveTab] = useState<string>('all')
  const router = useRouter()

  useEffect(() => {
    getCountries()
    .then(response => {
        setCountries(response?.data?.data || [])
    })
  }, [])

  useEffect(() => { 
    getCitiesByCountry(selectedCountry)
    .then(response => {
        setCities(response?.data?.data || [])
    })
        
  }, [selectedCountry])

  useEffect(() => {

    setLoad(true)
    let query = `page=${page}&limit=${rowsPerPage}`
    if(searchQuery) query += `&search=${searchQuery}`
    if(selectedCity) query += `&city=${selectedCity}` 
    if(selectedCountry) query += `&country=${selectedCountry}`
    if(activeTab === 'my' && activeShop?._id) query += `&shop=${activeShop._id}`

    getCompanyService(query)
    .then(response => {
      if(response.status === 200){
        console.log(response.data.data)
        setCount(response.data.total)
        setService(response.data.data)
      }
    })
    .finally(() => setLoad(false))
    
  }, [selectedCity, selectedCountry, searchQuery, page, rowsPerPage, activeTab])

  const handleTabChange = (event: SyntheticEvent, newValue: string) => {
    setActiveTab(newValue)
  }
  // const countries = useMemo(() => Array.from(new Set(deliveryServices.map(service => service.location.country))), [])

  // const cities = useMemo(() => Array.from(new Set(deliveryServices.map(service => service.location.city))), [])

  // Simulons des services associés à la boutique (à remplacer par une vraie API)
  // const myServices = useMemo(
  //   () => deliveryServices.slice(0, 3), // Pour l'exemple, prenons les 3 premiers services
  //   []
  // )

  // const filteredServices = useMemo(() => {
  //   const services = activeTab === 'my' ? myServices : deliveryServices
  //   return services.filter(service => {
  //     const matchesSearch =
  //       service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //       service.description.toLowerCase().includes(searchQuery.toLowerCase())
  //     const matchesCountry = !selectedCountry || service.location.country === selectedCountry
  //     const matchesCity = !selectedCity || service.location.city === selectedCity

  //     return matchesSearch && matchesCountry && matchesCity
  //   })
  // }, [searchQuery, selectedCountry, selectedCity, activeTab, myServices])

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value)
  }

  return (
    <Container maxWidth='lg'>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
        <Typography
          component='h1'
          variant='h3'
          sx={{
            color: '#6B7280',
            fontWeight: 'light'
          }}
        >
          {t('delivery_service')}
        </Typography>
        <Button variant='contained' startIcon={<Plus />} onClick={() => router.push('shop-services/create')}>
          {t('add_service')}
        </Button>
      </Box>
      <TabContext value={activeTab}>
        <TabList onChange={handleTabChange} aria-label='account-settings tabs' sx={{ mb: 10 }}>
          <Tab
            value='all'
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TabName className=' inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'>
                  {t('all_service')}
                </TabName>
              </Box>
            }
          />
          <Tab
            value='my'
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TabName>{t('my_service')}</TabName>
              </Box>
            }
          />
        </TabList>

        <TabPanel sx={{ p: 0 }} value='all'>
          <Box
            sx={{
              mb: 4,
              p: 4,
              backgroundColor: 'white',
              borderRadius: 2,
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('search')}
                  variant='outlined'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#F8FAFC'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label={t('country')}
                  value={selectedCountry}
                  onChange={e => setSelectedCountry(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#F8FAFC'
                    }
                  }}
                >
                  <MenuItem value=''>Tous les pays</MenuItem>
                  {countries.map(country => (
                    <MenuItem key={country?._id} value={country?._id}>
                      {country[i18n.language || 'fr']}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label={t('city')}
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#F8FAFC'
                    }
                  }}
                >
                  <MenuItem value=''>Toutes les villes</MenuItem>
                  {cities.map(city => (
                    <MenuItem key={city?._id} value={city?._id}>
                      {city?.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Box>
          {load && <CircularProgress size={40} sx={{ ml: '50%' }} color='inherit' />}
          {!load && (
            <>
              <Grid container spacing={4}>
                {service.map(service => (
                  <Grid item key={service._id} xs={12} sm={6} md={4}>
                    <DeliveryServiceCard service={service} />
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ mt: 8, mb: 4 }}>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 100]}
                  component='div'
                  count={count}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage='Pages'
                />
              </Box>
            </>
          )}
          
        </TabPanel>

        <TabPanel sx={{ p: 0 }} value='my'>
          {load && <CircularProgress size={40} sx={{ ml: '50%' }} color='inherit' />}
          {!load && (
            <Grid container spacing={4}>
              {service.map(service => (
                <Grid item key={service._id} xs={12} sm={6} md={4}>
                  {/* <DeliveryServiceCard service={service} /> */}
                </Grid>
              ))}
            </Grid>
          )}
          
        </TabPanel>
      </TabContext>
    </Container>
  )
}

export default Index
