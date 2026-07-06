/* eslint-disable react-hooks/exhaustive-deps */
// ** MUI Imports
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableRow from '@mui/material/TableRow'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TablePagination from '@mui/material/TablePagination'

// ** Demo Components Imports
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { Avatar, Box, Chip, CircularProgress, FormControl, IconButton } from '@mui/material'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { SwapVert } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { getDeliveredOrders, getDeliveredServices, updateOrder } from 'src/@apiCore/npoints'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Addprice from 'src/views/orders/addPrice'
import MultipleSelectChip from 'src/@core/components/multi-select'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { toast } from 'react-toastify'
import { formatNumber } from 'src/@core/utils/format-currency'
import moment from 'moment'
import 'moment/locale/fr'

import { useSettings } from 'src/@core/hooks/useSettings'

interface Column {
  id: 'ID' | 'Products' | 'total_product' | 'status' | 'action' | 'customer' | 'dev_date' | 'Shipping_adress' | 'shop'
  label: string
  minWidth?: number
  align?: 'right'
  format?: (value: number) => string
  sort?: boolean
}

const columns: readonly Column[] = [
  { id: 'ID', label: 'Order' },
  { id: 'shop', label: 'Shop' },
  { id: 'customer', label: 'Customer' },
  {
    id: 'Products',
    label: 'Number',
    align: 'right',
    format: (value: number) => value.toLocaleString('en-US')
  },
  {
    id: 'total_product',
    label: 'Date',
    align: 'right',
    format: (value: number) => value.toFixed(2),
    minWidth: 200
  },
  {
    id: 'status',
    label: 'status',
    align: 'right',
    sort: true
  },
  {
    id: 'Shipping_adress',
    label: 'deliveryAddress',
    align: 'right',
    sort: false,
    minWidth: 200
  },
  {
    id: 'dev_date',
    label: 'deliveryDate',
    align: 'right',
    sort: false,
    minWidth: 200
  },
  {
    id: 'action',
    label: 'Actions',
    align: 'right'
  }
]

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common', 'order', 'shop']))
    }
  }
}

interface Order {
  _id: string
  total: string
  items: any
  status: string
  customer: {
    name: string
    email: string
    image: string
    phone: string
  }
  order_id: string
  shop: any
  deliveryInfo: any
}

const Orders = () => {
  const { t, i18n } = useTranslation('order')
  moment.locale(i18n.language)
  const router = useRouter()
  const [openAddPrice, setOpenAddPrice] = React.useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [count, setCount] = useState(0)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const [selectedId, setSelectedId] = useState('')
  const [sortBy, setSortBy] = useState('status')
  const [desc, setDesc] = useState(true)
  const [load, setLoad] = useState(false)
  const [listAddress, setListAddress] = useState([])
  const [addresses, setAddresses] = useState([])
  const [shops, setShops] = useState([])
  const [listShops, setListShops] = useState<any[]>([])


  const { user } = useGlobalContext()
  const { settings } = useSettings()
  const handleClick = (event: React.MouseEvent<HTMLElement>, item: any) => {
    setSelectedId(item._id)
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value)
    setPage(0)
  }

  useEffect(() => {
    setLoad(true)
    if (user?._id) {
      handleGetOrders()
    }
  }, [rowsPerPage, sortBy, desc, page, addresses, user, shops])

  useEffect(() => {
    if (user?._id) {
      getDeliveredServices(user?._id)
        .then(res => {
          let shopData: any[] = []
          const shopsData: any[] = []

          const mapServices = res.data.data.map((ele: any) => {
            shopData = shopData.concat(ele.shops)

            return {
              name: ele.name,
              _id: ele._id
            }
          })
          for (let item of shopData) {
            if (!shopsData.find((v: any) => v._id == item?.shop?._id) && item?.shop?.name)
              shopsData.push({
                name: item?.shop?.name,
                _id: item?.shop?._id
              })
          }
          setListShops(shopsData)
          setListAddress(mapServices)
        })
        .catch(err => console.log(err))
    }
  }, [user])

  const handleGetOrders = () => {
    let query = `?userId=${user?._id}&page=${page + 1}&sortOrder=${desc ? 'desc' : 'asc'}`
    if (rowsPerPage) {
      query += '&limit=' + rowsPerPage
    }
    if (sortBy) {
      query += '&sortBy=' + sortBy
    }
    if (addresses) {
      const ids = addresses.map((address: any) => address._id)
      const serializedIds = ids.join(',')
      query += '&services=' + serializedIds
    }

    if (shops) {
      const ids = shops.map((address: any) => address._id)
      const serializedIds = ids.join(',')
      query += '&shops=' + serializedIds
    }

    getDeliveredOrders(query)
      .then(resp => {
        if (resp.data.success) {
          setOrders(resp.data.data)
          setCount(resp.data.pagination.totalItems)
        }

        setLoad(false)
      })
      .finally(() => setLoad(false))
  }

  const handleSort = (type: string) => {
    setSortBy(type)
    setDesc(!desc)
  }

  const getStatusColor = (status: any) => {
    switch (status) {
      case 'processing':
        return 'warning'
      case 'shipped':
        return 'success'
      case 'delivered':
        return 'success'
      case 'returned':
        return 'secondary'
      case 'refunded':
        return 'primary'
      case 'cancelled':
        return 'error'
      default:
        return 'warning'
    }
  }

  const handleDelivered = () => {
    setOpenAddPrice(true)
  }

  const handleView = (item: any) => {
    router.push('/app/orders/' + item._id)
  }

  const handleAddPrice = (price: number) => {
    const order = orders.find(item => item._id == selectedId)
    updateOrder(`${selectedId}`, {
      status: 'delivered',
      isStatus: 'Y',
      deliveryPrice: price,
      sendNotification: true,
      lang: i18n.language,
      userNotifyId: order?.shop?.user?._id,
      userNotifyEmail: order?.shop?.user?.email,
      isDelivery: true
    })
      .then(response => {
        if (response.status == 201) {
          const updatedItems = orders.map(item => {
            if (item._id === selectedId) {
              return { ...item, status: 'delivered' }
            }

            return item
          })
          setOrders(updatedItems)
          toast.success(t('success_modify'))
        } else toast.error(t('error_update'))
      })
      .catch(() => toast.error(t('error_update')))
      .finally(() => setLoad(false))
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h5'>
          <Link>{t('command_title')}</Link>
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Grid container  alignItems={'center'}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <MultipleSelectChip
                name={'filter_by_del'}
                list={listAddress}
                values={addresses}
                setValues={setAddresses}
                isCity={true}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4} ml={5}>
            <FormControl fullWidth>
              <MultipleSelectChip
                name={'shop'}
                list={listShops}
                values={shops}
                setValues={setShops}
                isCity={true}
              />
            </FormControl>
          </Grid>
          <Grid item flex={1} ml={5}>
            <Typography textAlign={"right"} marginRight={2} fontSize={14}>
              {count} {t('Orders')}
            </Typography>
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <Card className={'responsiveTable-' + settings?.mode}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }} className={'responsiveTable-' + settings?.mode}>
            <TableContainer sx={{}}>
              <Table stickyHeader aria-label='sticky table'>
                <TableHead>
                  <TableRow>
                    {columns.map(column => (
                      <TableCell key={column.id} sx={{ minWidth: column.minWidth, flexDirection: 'row' }}>
                        <Grid container alignItems='center' justifyContent={'center'}>
                          <Grid item>{t(`${column.id}`)}</Grid>
                          {column?.sort && (
                            <Grid item>
                              <div onClick={() => handleSort(column.id)} style={{ cursor: 'pointer', padding: 4 }}>
                                <SwapVert />
                              </div>
                            </Grid>
                          )}
                        </Grid>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                {load && (
                  <TableRow>
                    <TableCell colSpan={columns.length} align='center'>
                      <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                        <CircularProgress size={40} color='inherit' />
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {!load && (
                  <TableBody>
                    {orders?.map((row, index) => {
                      return (
                        <TableRow hover tabIndex={-1} key={row._id}>
                          <TableCell align={'center'}>
                            <Box display='flex' alignItems='center' justifyContent={'space-between'}>
                              <span onClick={() => handleView(row)} style={{ color: 'blue', cursor: 'pointer' }}>
                                #{row.order_id || index + 1}
                              </span>
                              <div className='d-md-none'>
                                <IconButton
                                  aria-label='more'
                                  id='long-button1'
                                  aria-controls={open ? 'long-menu' : undefined}
                                  aria-expanded={open ? 'true' : undefined}
                                  aria-haspopup='true'
                                  onClick={event => handleClick(event, row)}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                                <Menu
                                  id='long-menu1'
                                  MenuListProps={{
                                    'aria-labelledby': 'long-button1'
                                  }}
                                  anchorEl={anchorEl}
                                  open={open && selectedId === row._id}
                                  onClose={handleClose}
                                  sx={{ p: 0 }}
                                >
                                  <MenuItem onClick={() => handleView(row)}>{t('view_more')}</MenuItem>
                                  {(row.status === 'processing' || row.status === 'sent_to_delivry') && (
                                    <MenuItem sx={{}} onClick={() => handleDelivered()}>
                                      {t('mark_delivered')}
                                    </MenuItem>
                                  )}
                                </Menu>
                              </div>
                            </Box>
                          </TableCell>
                          <TableCell align={'center'} data-label={t(`customer`)}>
                            <Box display='flex' justifyContent={'left'} className='justify-sm-right'>
                              <Avatar src={row.shop?.logo}>{row.shop?.name?.slice(0, 1)}</Avatar>
                              <Box marginLeft={2}>
                                <Typography fontSize={14} align='left'>
                                  {row.shop?.name}
                                </Typography>
                                <Typography fontSize={11} align='left'>
                                  {row.shop?.email || row.shop?.phone}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align={'center'} data-label={t(`customer`)}>
                            <Box display='flex' justifyContent={'left'} className='justify-sm-right'>
                              <Avatar src={row.customer?.image}>{row.customer?.name?.slice(0, 1)}</Avatar>
                              <Box marginLeft={2}>
                                <Typography fontSize={14} align='left'>
                                  {row.customer?.name}
                                </Typography>
                                <Typography fontSize={11} align='left'>
                                  {row.customer?.email || row.customer?.phone}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align={'center'} data-label={t(`Products`)}>
                            <Typography fontSize={11}>{row.items.length}</Typography>
                          </TableCell>

                          <TableCell align={'center'} data-label={t(`total`)}>
                            {formatNumber(row.total)} {row.shop?.currency}
                          </TableCell>
                          <TableCell align={'center'} data-label={t(`status`)}>
                            <Chip
                              label={t(`${row?.status == 'sent_to_delivry' ? 'processing' : row?.status}_`)}
                              color={getStatusColor(row?.status)}
                              sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                textTransform: 'capitalize',
                                '& .MuiChip-label': { fontWeight: 500 }
                              }}
                            />
                          </TableCell>
                          <TableCell align={'center'} data-label={t(`Shipping_adress`)}>
                            {(row.deliveryInfo?.address || '') +
                              (row.deliveryInfo?.city ? ', ' + row.deliveryInfo?.city : '')}
                          </TableCell>
                          <TableCell align={'center'} className='b-bt-0' data-label={t(`dev_date`)}>
                            {moment(row.deliveryInfo?.date).format('LL')}
                          </TableCell>
                          <TableCell align={'center'} className='d-sm-none'>
                            <div>
                              <IconButton
                                aria-label='more'
                                id='long-button'
                                aria-controls={open ? 'long-menu' : undefined}
                                aria-expanded={open ? 'true' : undefined}
                                aria-haspopup='true'
                                onClick={event => handleClick(event, row)}
                              >
                                <MoreVertIcon />
                              </IconButton>
                              <Menu
                                id='long-menu'
                                MenuListProps={{
                                  'aria-labelledby': 'long-button'
                                }}
                                anchorEl={anchorEl}
                                open={open && selectedId === row._id}
                                onClose={handleClose}
                                PaperProps={{
                                  style: {
                                    maxHeight: 48 * 4.5,
                                    width: '20ch'
                                  }
                                }}
                              >
                                <MenuItem onClick={() => handleView(row)}>{t('view_more')}</MenuItem>
                                {(row.status === 'processing' || row.status === 'sent_to_delivry') && (
                                  <MenuItem sx={{}} onClick={() => handleDelivered()}>
                                    {t('mark_delivered')}
                                  </MenuItem>
                                )}
                              </Menu>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                )}
              </Table>
            </TableContainer>
            <Addprice open={openAddPrice} setOpen={setOpenAddPrice} handleAddPrice={handleAddPrice} />
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
          </Paper>
        </Card>
      </Grid>
    </Grid>
  )
}

export default Orders
