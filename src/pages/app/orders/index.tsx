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
import { Avatar, Box, Button, Chip, CircularProgress, IconButton, Tooltip } from '@mui/material'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { Add, SwapVert } from '@mui/icons-material'
import { makeStyles } from '@mui/styles'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { countOrderStatus, deleteOrderRequest, getOrders, getShopServices, updateOrder } from 'src/@apiCore/npoints'
import moment from 'moment'
import { CheckCircle, Cancel, HourglassEmpty, DeliveryDining } from '@mui/icons-material' // Import icons
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import MoreVertIcon from '@mui/icons-material/MoreVertRounded'
import { toast } from 'react-toastify'
import swal from 'sweetalert'
import InputSearch from 'src/views/search/InputSearch'
import 'moment/locale/fr'
import AddService from 'src/views/orders/AddService'
import { Object } from 'src/types'
import { formatNumber } from 'src/@core/utils/format-currency'
import { useSettings } from 'src/@core/hooks/useSettings'

interface Column {
  id: 'ID' | 'product' | 'customer' | 'status' | 'date' | 'action' | 'total' | 'Products'
  label: string
  minWidth?: number
  align?: 'right'
  format?: (value: number) => string
  sort?: boolean
}

const columns: readonly Column[] = [
  { id: 'ID', label: 'ID' },
  {
    id: 'customer',
    label: 'customer',
    align: 'right',
    format: (value: number) => value.toLocaleString('en-US')
  },
  {
    id: 'Products',
    label: 'Products',
    align: 'right',
    sort: false
  },
  {
    id: 'total',
    label: 'total',
    align: 'right',
    sort: true
  },
  {
    id: 'status',
    label: 'status',
    align: 'right',
    sort: true
  },
  {
    id: 'date',
    label: 'Date',
    align: 'right',
    format: (value: number) => value.toFixed(2),
    sort: true
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
      ...(await serverSideTranslations(locale ?? 'fr', ['common', 'order']))
    }
  }
}

const useStyles = makeStyles(() => ({
  paper: {
    padding: 10,
    position: 'relative'
  },
  icon: {
    position: 'absolute',
    top: '50%',
    right: 2,
    transform: 'translateY(-50%)'
  }
}))

interface Order {
  _id: string
  order_id: number
  customer: {
    name: string
    email: string
    image: string
    phone: string
  }
  date: string
  status: string
  deliveryService: string
  total: string
  items: string
}

const Orders = () => {
  const { t, i18n } = useTranslation('order')
  const router = useRouter()
  const { activeShop } = useGlobalContext()
  const [orders, setOrders] = useState<Order[]>([])
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(5)
  const [count, setCount] = useState(0)
  const classes = useStyles()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const [selectedId, setSelectedId] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [desc, setDesc] = useState(true)
  const [load, setLoad] = useState(false)
  const [forceReload, setForceReload] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [orderStatus, setOrderStatus] = useState<any[]>([])
  const [openAddService, setOpenAddService] = React.useState(false)
  const [search, setSearch] = useState('')
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
    if (activeShop?._id) {
      getShopServices(activeShop?._id).then(response => {
        if (response.status == 200) setServices(response.data.data)
      })
    }
  }, [activeShop])

  useEffect(() => {
    if (activeShop?._id) {
      countOrderStatus(activeShop?._id).then(response => {
        setOrderStatus(response.data.data)
      })
    }
  }, [activeShop, forceReload])

  useEffect(() => {
    if (activeShop?._id) {
      setLoad(true)
      handleGetOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShop, rowsPerPage, sortBy, desc, page, forceReload, search])

  const handleGetOrders = () => {
    let query = `?page=${page + 1}&sortOrder=${desc ? 'desc' : 'asc'}`
    if (rowsPerPage) {
      query += '&limit=' + rowsPerPage
    }
    if (sortBy) {
      query += '&sortBy=' + sortBy
    }
    if (search) query += '&search=' + search

    getOrders(activeShop?._id, query)
      .then(resp => {
        setOrders(resp.data.data)
        setCount(resp.data.pagination?.totalItems)
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
      case 'sent_to_delivry':
        return 'info'
      default:
        return 'warning'
    }
  }

  const countOrdersByStatus = (status: string): number => {
    return orderStatus.find(item => item._id == status)?.count || 0
  }

  const handleView = (item: any) => {
    router.push('/app/orders/' + item._id)
  }

  const handleDelete = (item: any) => {
    // delete operation
    if (item._id.length > 0) {
      swal({
        title: '',
        text: t('delete_text') + '',
        icon: 'error',
        buttons: [t('cancel') + '', t('delete') + ''],
        dangerMode: true
      }).then(willDelete => {
        if (willDelete) {
          deleteOrderRequest(item._id).then(response => {
            if (response.status == 200) {
              setForceReload(!forceReload)
              toast.success(t('delete_success'))
            } else toast.error(t('error'))
          })
        }
      })
    }
  }

  const handleStatus = (id: string, status: string) => {
    updateOrder(id, { status: status, isStatus: 'Y' })
      .then(response => {
        if (response.status == 201) {
          toast.success(t('success_modify'))
          setForceReload(!forceReload)
          setAnchorEl(null)
        } else toast.error(t('error_update'))
      })
      .catch(() => toast.error(t('error_update')))
      .finally(() => setLoad(false))
  }

  const handleSubmit = (service: string, userId: string, userEmail: string) => {
    updateOrder(selectedId, {
      deliveryService: service,
      isStatus: 'Y',
      status: 'sent_to_delivry',
      sendNotification: true,
      lang: i18n.language,
      userNotifyId: userId,
      userNotifyEmail: userEmail
    })
      .then(response => {
        if (response.status == 201) {
          toast.success(t('success_modify'))
          setForceReload(!forceReload)
          setAnchorEl(null)
        } else toast.error(t('error_update'))
      })
      .catch(() => toast.error(t('error_update')))
      .finally(() => setLoad(false))
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h5'>
          <Link href='#'>{t('command_title')}</Link>
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper className={classes.paper}>
              <Typography variant='h6'>{t('pending_order')}</Typography>
              <Typography variant='h4'>{countOrdersByStatus('processing')}</Typography>
              <IconButton className={classes.icon}>
                <HourglassEmpty />
              </IconButton>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper className={classes.paper}>
              <Typography variant='h6'>{t('sent_to_deliver')}</Typography>
              <Typography variant='h4'>{countOrdersByStatus('sent_to_delivry')}</Typography>
              <IconButton className={classes.icon}>
                <DeliveryDining />
              </IconButton>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper className={classes.paper}>
              <Typography variant='h6'>{t('completed_order')}</Typography>
              <Typography variant='h4'>{countOrdersByStatus('delivered')}</Typography>
              <IconButton className={classes.icon}>
                <CheckCircle />
              </IconButton>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper className={classes.paper}>
              <Typography variant='h6'>{t('failed_order')}</Typography>
              <Typography variant='h4'>{countOrdersByStatus('cancelled')}</Typography>
              <IconButton className={classes.icon}>
                <Cancel />
              </IconButton>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={6} alignItems={'center'}>
          <Grid item xs={12} sm={5}>
            <InputSearch
              objectName={Object.Order}
              setSearch={val => {
                setSearch(val)
                setPage(0)
              }}
              search={search}
              data={orders}
              placeholder={t('order_id')}
            />
          </Grid>
          <Grid item xs={12} sm={7} display={'flex'} justifyContent={'flex-end'}>
            <Button
              startIcon={<Add />}
              onClick={() => router.push('orders/create')}
              size='medium'
              variant='contained'
              sx={{ textTransform: 'initial' }}
            >
              {t('new_order')}
            </Button>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Card className={'responsiveTable-' + settings?.mode}>
          <Paper className={'responsiveTable-' + settings?.mode}>
            <TableContainer sx={{}}>
              <Table stickyHeader aria-label='sticky table'>
                <TableHead>
                  <TableRow>
                    {columns.map(column => (
                      <TableCell key={column.id} sx={{ minWidth: column.minWidth, flexDirection: 'row' }}>
                        <Grid container alignItems='center' justifyContent={'center'}>
                          <Grid item>{t(`${column.label}`)}</Grid>
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
                                  PaperProps={{
                                    style: {
                                      maxHeight: 48 * 4.5,
                                      width: '20ch'
                                    }
                                  }}
                                >
                                  {row.status === 'processing' && (
                                    <>
                                      {services.length && !row.deliveryService ? (
                                        <MenuItem onClick={() => setOpenAddService(true)}>
                                          {t(`sent_to_deliver1`)}
                                        </MenuItem>
                                      ):<></>}
                                      <MenuItem onClick={() => handleStatus(row._id, 'delivered')}>
                                        {t(`deliver`)}
                                      </MenuItem>
                                      <MenuItem onClick={() => handleStatus(row._id, 'cancelled')}>
                                        {t(`cancel`)}
                                      </MenuItem>
                                    </>
                                  )}
                                  {row.status === 'cancelled' && (
                                    <MenuItem onClick={() => handleStatus(row._id, 'processing')}>
                                      {t(`processing`)}
                                    </MenuItem>
                                  )}
                                  <MenuItem onClick={() => handleView(row)}>{t('view_more')}</MenuItem>
                                  <MenuItem sx={{ color: 'red' }} onClick={() => handleDelete(row)}>
                                    {t('delete')}
                                  </MenuItem>
                                </Menu>
                              </div>
                            </Box>
                          </TableCell>
                          <TableCell align={'center'} data-label={t(`customer`)}>
                            <Box
                              display='flex'
                              alignItems='center'
                              justifyContent={'left'}
                              className='justify-sm-right'
                            >
                              <Avatar src={row.customer?.image}>{row.customer?.name?.slice(0, 1)}</Avatar>
                              <Box marginLeft={2}>
                                <Typography fontSize={14} align='left'>
                                  {row.customer?.name}
                                </Typography>
                                <Typography variant='body2' fontSize={11} align='left'>
                                  {row.customer?.email || row.customer?.phone}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell data-label={t(`Products`)} align={'center'}>
                            {row?.items?.length}
                          </TableCell>
                          <TableCell align={'center'} data-label={t(`total`)}>
                            {formatNumber(row?.total) + ' ' + activeShop?.currency}
                          </TableCell>
                          <TableCell align={'center'} data-label={t(`status`)}>
                            <Chip
                              label={t(`${row?.status}_`)}
                              color={getStatusColor(row?.status)}
                              sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                textTransform: 'capitalize',
                                '& .MuiChip-label': { fontWeight: 500 }
                              }}
                            />
                          </TableCell>
                          <TableCell align={'center'} data-label={t(`date`)} className='b-bt-0'>
                            <Tooltip placement='top' title={moment(row?.date).format('LLL')}>
                              <Box>{moment(row?.date).fromNow()}</Box>
                            </Tooltip>
                          </TableCell>

                          <TableCell align={'center'} className='d-sm-none' data-label={t(`Actions`)}>
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
                                {row.status === 'processing' && (
                                  <>
                                    {services.length && !row.deliveryService ? (
                                      <MenuItem onClick={() => setOpenAddService(true)}>
                                        {t(`sent_to_deliver1`)}
                                      </MenuItem>
                                    ) : (
                                      <></>
                                    )}
                                    <MenuItem onClick={() => handleStatus(row._id, 'delivered')}>
                                      {t(`deliver`)}
                                    </MenuItem>
                                    <MenuItem onClick={() => handleStatus(row._id, 'cancelled')}>
                                      {t(`cancel`)}
                                    </MenuItem>
                                  </>
                                )}
                                {row.status === 'cancelled' && (
                                  <MenuItem onClick={() => handleStatus(row._id, 'processing')}>
                                    {t(`processing`)}
                                  </MenuItem>
                                )}
                                <MenuItem onClick={() => handleView(row)}>{t('view_more')}</MenuItem>
                                <MenuItem sx={{ color: 'red' }} onClick={() => handleDelete(row)}>
                                  {t('delete')}
                                </MenuItem>
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
            <AddService
              open={openAddService}
              setOpen={setOpenAddService}
              handleAddService={(val: string, userId: string, userEmail: string) =>
                handleSubmit(val, userId, userEmail)
              }
              services={services}
            />
          </Paper>
        </Card>
      </Grid>
    </Grid>
  )
}

export default Orders
