// ** React Imports
import { useState, useEffect, ChangeEvent } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

// ** Icons Imports
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { CircularProgress, FormControl, InputLabel, MenuItem, Select, TablePagination } from '@mui/material'
import CountryAndCity from './CountryAndCity'
import CompanyItem from './CompanyItem'
import { getDrivers } from 'src/@apiCore/npoints'

const DeliveryCompany = () => {
  const { t } = useTranslation('shop')
  const { activeShop } = useGlobalContext()!
  const [load, setLoad] = useState(true)
  const [cities, setCities] = useState(
    activeShop?.deliveryCities.length ? activeShop?.deliveryCities : [{ _id: activeShop?.city }] || []
  )
  const [country, setCountry] = useState(activeShop?.country)
  const [drivers, setDrivers] = useState<any[]>([])
  const [type, setType] = useState('all')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(5)
  const [total, setTotal] = useState(0)
  const [refresh, setRefresh] = useState(false)


  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setLimit(+event.target.value)
    setPage(0)
  }

  useEffect(() => {
    setLoad(true)
    const cityVal = cities.map((item:any) => item._id).toString()
    getDrivers(activeShop?._id, cityVal, country, type, page, limit)
      .then(response => {
        if (response.status == 200) {
          setDrivers(response.data.data)
          setTotal(response.data.total)
        }
      })
      .finally(() => setLoad(false))
  }, [country, activeShop, cities, page, limit, type, refresh])

  return (
    <CardContent>
      <Box>
        <Typography variant='body1'>{t('delivery_company_text')}</Typography>
      </Box>
      <Grid container spacing={7} mt={3}>
        <CountryAndCity
          sm={4}
          defaultCountry={activeShop?.country}
          values={cities}
          setValues={setCities}
          showAll
          country={country}
          setCountry={setCountry}
          isMultipleCity={true}
        />
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>{t('type_comapny')}</InputLabel>
            <Select
              required
              label={t('type_comapny')}
              onChange={e => setType(e.target.value)}
              value={type}
              placeholder={`${t('type_comapny')}`}
              name='type'
            >
              <MenuItem value={'all'}>{t('all_company')}</MenuItem>
              <MenuItem value={'my_company'}>{t('my_company')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      <Box mt={5}>
        {load ? (
          <Grid display={'flex'} justifyContent={'center'} flex={1}>
            <CircularProgress size={50} sx={{ ml: 5 }} color='inherit' />
          </Grid>
        ) : (
          <>
            {!drivers.length && (
              <Typography variant='body2' align='center' color='text.secondary'>
                {t('no_company')}
              </Typography>
            )}
            {drivers.map(item => (
              <CompanyItem item={item} key={item._id} handleRefresh={()=>setRefresh(!refresh)} />
            ))}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 100]}
              component='div'
              count={total}
              rowsPerPage={limit}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Box>
    </CardContent>
  )
}

export default DeliveryCompany
