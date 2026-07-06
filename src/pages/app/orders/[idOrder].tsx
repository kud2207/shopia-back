import * as React from 'react'
import { styled } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import Checkbox from '@mui/material/Checkbox'
import { visuallyHidden } from '@mui/utils'
import { Alert, Avatar, Button, CircularProgress, Typography } from '@mui/material'
import Timeline from '@mui/lab/Timeline'
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import { useRouter } from 'next/router'
import {
  deleteOrderRequest,
  getOrderActivities,
  getOrderById,
  getInvoiceByIdShop,
  updateOrder
} from 'src/@apiCore/npoints'
import { useTranslation } from 'react-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import swal from 'sweetalert'
import { useGlobalContext } from 'src/@core/context/globalContext'
import moment from 'moment'
import 'moment/locale/fr'
import OrderPDF from 'src/layouts/components/printOrder/OrderPdf'
import { formatNumber } from 'src/@core/utils/format-currency'
import AddPrice from 'src/views/orders/addPrice'
import { toast } from 'react-toastify'

export async function getServerSideProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['order', 'common']))
    }
  }
}

interface Data {
  id: string
  Price: number
  Total: number
  Quantity: number
  Products: string
}

function createData(id: string, Products: string, Price: number, Quantity: number, Total: number): Data {
  return {
    id,
    Products,
    Price,
    Quantity,
    Total
  }
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1
  }
  if (b[orderBy] > a[orderBy]) {
    return 1
  }

  return 0
}

type Order = 'asc' | 'desc'

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key
): (a: { [key in Key]: number | string }, b: { [key in Key]: number | string }) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy)
}

function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number])
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0])
    if (order !== 0) {
      return order
    }

    return a[1] - b[1]
  })

  return stabilizedThis.map(el => el[0])
}

interface HeadCell {
  disablePadding: boolean
  id: keyof Data
  label: string
  numeric: boolean
}

interface EnhancedTableProps {
  numSelected: number
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof Data) => void
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void
  order: Order
  orderBy: string
  rowCount: number
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { t, i18n } = useTranslation('order')
  const headCells: readonly HeadCell[] = [
    {
      id: 'Products',
      numeric: false,
      disablePadding: true,
      label: t('Products')
    },
    {
      id: 'Price',
      numeric: true,
      disablePadding: false,
      label: t('Price')
    },
    {
      id: 'Quantity',
      numeric: true,
      disablePadding: false,
      label: t('Quantity')
    },
    {
      id: 'Total',
      numeric: true,
      disablePadding: false,
      label: t('Total')
    }
  ]

  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props
  const createSortHandler = (property: keyof Data) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property)
  }

  return (
    <TableHead>
      <TableRow>
        <TableCell padding='checkbox'>
          <Checkbox
            color='primary'
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{
              'aria-label': 'select all desserts'
            }}
          />
        </TableCell>
        {headCells.map(headCell => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component='span' sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  )
}

const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary
}))

const OrderDetails = () => {
  const [order, setOrder] = React.useState<Order>('asc')
  const [orderBy, setOrderBy] = React.useState<keyof Data>('Price')
  const [selected, setSelected] = React.useState<readonly number[]>([])
  const [page, setPage] = React.useState(0)
  const [rows, setRows] = React.useState<any>([])
  const [customer, setCustomer] = React.useState<any>({})
  const [rowsPerPage, setRowsPerPage] = React.useState(5)
  const [totalAmount, setTotalAmount] = React.useState(0)
  const [orderId, setOrderId] = React.useState<string>('')
  const [error, setError] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [serverMsg, setServerMsg] = React.useState('')
  const router = useRouter()
  const { activeShop, user } = useGlobalContext()
  const [orderData, setOrderData] = React.useState<any>(null)
  const [orderActivities, setOrderActivities] = React.useState<any>([])
  const [invoice, setInvoice] = React.useState({})
  const [loadingPrintData, setLoadingPrintData] = React.useState(true)
  const [openAddPrice, setOpenAddPrice] = React.useState(false)
  const [shop, setShop] = React.useState<any>(null)

  const { idOrder } = router.query

  const { t, i18n } = useTranslation('order')

  const getOderDetails = (id: any) => {
    getOrderById(id)
      .then(data => {
        console.log(data.data.data)
        if (data.status == 200) {
          setOrderData(data.data.data)
          setOrderId(data.data.data._id)
          setTotalAmount(data.data.data.total)
          setCustomer(data.data.data.customer)
          setShop(data.data.data.shop)
          setRows(() => {
            return data.data.data.items.map((item: any) =>
              createData(item._id, item.product?.name, item.total / item.quantity, item.quantity, item.total)
            )
          })
          setLoadingPrintData(false)
        } else {
          setError(true)
          setServerMsg(data.data.data)
        }
      })
      .catch(err => {
        setError(true)
        setServerMsg(err.message)
      })
  }

  const getShopInvoice = () => {
    getInvoiceByIdShop(activeShop?._id || shop?._id)
      .then((response: any) => {
        if (response.status == 200) {
          setInvoice({
            salesPerson: response.data.data.salerPersone,
            thanksgiving: response.data.data.thanksgiving,
            note: response.data.data.note
          })
          setLoadingPrintData(false)
        }
      })
      .catch(() => {
        /** */
      })
  }

  React.useEffect(() => {
    if (idOrder) {
      getOderDetails(idOrder)
      getOrderActivities(idOrder).then(data => setOrderActivities(data.data.data))
    }

  }, [activeShop?._id, idOrder])

  React.useEffect(() => {

    if (activeShop?._id || shop?._id) {
      getShopInvoice()
    }
  }, [activeShop?._id, idOrder, shop])

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof Data) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = rows.map((n: any) => n.id)
      setSelected(newSelected)

      return
    }
    setSelected([])
  }

  const handleClick = (event: React.MouseEvent<unknown>, id: any) => {
    const selectedIndex = selected.indexOf(id)
    let newSelected: readonly any[] = []

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id)
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1))
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1))
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1))
    }
    setSelected(newSelected)
  }

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleDeleteOrder = () => {
    if (orderId.length > 0) {
      swal({
        title: '',
        text: t('delete_text') + '',
        icon: 'error',
        buttons: [t('cancel') + '', t('delete') + ''],
        dangerMode: true
      }).then(willDelete => {
        if (willDelete) {
          setDeleting(true)

          deleteOrderRequest(orderId)
            .then(response => {
              setDeleting(false)
              if (response.status == 200) {
                // route liste des commandes
                swal('', t('delete_success') + '', 'success')
                router.back()
              }
            })
            .catch(err => {
              setDeleting(false)
              setError(true)
              setServerMsg(err.message)
            })
            .finally(() => setDeleting(false))
        }
      })
    }
  }

  const isSelected = (id: any) => selected.indexOf(id) !== -1

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0

  const visibleRows = React.useMemo(
    () => stableSort(rows, getComparator(order, orderBy)).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [order, orderBy, page, rowsPerPage, rows]
  )

  const handleUpdate = () => {
    router.push('/app/orders/update/' + idOrder)
  }

  const generatColor = (status: string) => {
    switch (status) {
      case 'Commande en cours de Livraison':
        return '#FFB400'
      case 'Creation de la commande':
        return '#56CA00'
      case 'Livraison de la commande':
        return '#56CA00'
      case 'returned':
        return 'secondary'
      case 'refunded':
        return 'primary'
      case 'Annulation de la commande':
        return '#FF4C51'
      default:
        return 'warning'
    }
  }

  const handleAddPrice = (price: number) => {
    updateOrder(`${orderData?._id}`, {
      status: 'delivered',
      isStatus: 'Y',
      deliveryPrice: price,
      sendNotification: true,
      lang: i18n.language,
      userNotifyId: orderData?.shop?.user?._id,
      userNotifyEmail: orderData?.shop?.user?.email,
      isDelivery: true
    })
      .then(response => {
        if (response.status == 201) {
          setOrderData({ ...orderData, status: 'delivered' })
          toast.success(t('success_modify'))
        } else toast.error(t('error_update'))
      })
      .catch(() => toast.error(t('error_update')))
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box className='d-sm-block' display={'flex'} flexDirection={'row'} alignItems={"center"} justifyContent={'space-between'}>
        <Typography variant='h5'>{t('order_detail')}</Typography>
        {user?.role == 'marchand' ? (
          <Box className='d-sm-block' display={'flex'}>
            {orderData && orderData?.status != 'delivered' && (
              <Button onClick={handleUpdate} variant='contained' sx={{ margin: 4 }}>
                {t('edit_order')}
              </Button>
            )}
            {loadingPrintData ? null : <OrderPDF invoiceForm={invoice} orderData={orderData} />}
            <Button color='error' onClick={handleDeleteOrder} variant='contained' sx={{ margin: 4 }}>
              {t('supprimer_commande')} {deleting && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
          </Box>
        ) : (
          user?.role == 'livreur' &&
          orderData &&
          orderData?.status != 'delivered' && (
            <Box className='d-sm-block' display={'flex'}>
              {loadingPrintData ? null : <OrderPDF invoiceForm={invoice} orderData={orderData} />}
              <Button onClick={() => setOpenAddPrice(true)} variant='contained' sx={{ margin: 4 }}>
                {t('mark_delivered')}
              </Button>
            </Box>
          )
        )}
      </Box>
      <AddPrice open={openAddPrice} setOpen={setOpenAddPrice} handleAddPrice={handleAddPrice} />
      <Grid style={{ height: 'auto', display: 'flex' }} container spacing={2}>
        <Grid item xs={12} md={8}>
          <Item sx={{ padding: 4 }}>
            <Box>
              <Paper sx={{ mb: 2 }}>
                {/* <EnhancedTableToolbar numSelected={selected.length} /> */}
                <TableContainer>
                  <Table sx={{ minWidth: 500 }} aria-labelledby='tableTitle' size={'medium'}>
                    <EnhancedTableHead
                      numSelected={selected.length}
                      order={order}
                      orderBy={orderBy}
                      onSelectAllClick={handleSelectAllClick}
                      onRequestSort={handleRequestSort}
                      rowCount={rows.length}
                    />
                    <TableBody>
                      {visibleRows.map((row, index) => {
                        const isItemSelected = isSelected(row.id)
                        const labelId = `enhanced-table-checkbox-${index}`

                        return (
                          <TableRow
                            hover
                            onClick={event => handleClick(event, row.id)}
                            role='checkbox'
                            aria-checked={isItemSelected}
                            tabIndex={-1}
                            key={row.id}
                            selected={isItemSelected}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell padding='checkbox'>
                              <Checkbox
                                color='primary'
                                checked={isItemSelected}
                                inputProps={{
                                  'aria-labelledby': labelId
                                }}
                              />
                            </TableCell>
                            <TableCell component='th' id={labelId} scope='row' padding='none'>
                              {row.Products}
                            </TableCell>
                            <TableCell align='right'>{formatNumber(row.Price)}</TableCell>
                            <TableCell align='right'>{row.Quantity}</TableCell>
                            <TableCell align='right'>{formatNumber(row.Total)}</TableCell>
                          </TableRow>
                        )
                      })}
                      {emptyRows > 0 && (
                        <TableRow
                          style={{
                            height: 53 * emptyRows
                          }}
                        >
                          <TableCell colSpan={6} />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component='div'
                  count={rows.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage='Pages'
                />
              </Paper>
              <Box display={'flex'} flexDirection={'row'} justifyContent={'flex-end'} mt={5}>
                <Box
                  display={'flex'}
                  flexDirection={'row'}
                  justifyContent={'space-between'}
                  fontSize={15}
                  className='w-sub'
                >
                  <Box fontWeight={'bold'}>{t('subtotal')}</Box>
                  <Box>
                    {formatNumber(totalAmount)} {activeShop?.currency || orderData?.shop?.currency}
                  </Box>
                </Box>
              </Box>
              <Box display={'flex'} flexDirection={'row'} justifyContent={'flex-end'}>
                <Box
                  display={'flex'}
                  flexDirection={'row'}
                  justifyContent={'space-between'}
                  fontSize={15}
                  className='w-sub'
                >
                  <Box fontWeight={'bold'}>{t('discount')}</Box>
                  <Box>0 {activeShop?.currency}</Box>
                </Box>
              </Box>
              <Box display={'flex'} flexDirection={'row'} justifyContent={'flex-end'}>
                <Box
                  display={'flex'}
                  flexDirection={'row'}
                  justifyContent={'space-between'}
                  fontSize={15}
                  className='w-sub'
                >
                  <Box fontWeight={'bold'}>{t('Total')}</Box>
                  <Box>
                    {formatNumber(totalAmount)} {activeShop?.currency || orderData?.shop?.currency}
                  </Box>
                </Box>
              </Box>
              {error && (
                <Alert severity='error' sx={{ mb: 4 }}>
                  {serverMsg}
                </Alert>
              )}
            </Box>
          </Item>
          <Item sx={{ padding: 4, mt: 4 }}>
            <Typography variant='body1' textAlign={'left'}>
              {t('Shipping_activity')}
            </Typography>
            <Timeline
              sx={{
                [`& .${timelineItemClasses.root}:before`]: {
                  flex: 0,
                  padding: 0
                }
              }}
            >
              {orderActivities?.map((e: any, i: any) => {
                return (
                  <TimelineItem key={i}>
                    <TimelineSeparator>
                      <TimelineDot />
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <Box color={generatColor(e.activityLabel)}>{t(e.activityLabel)}</Box>
                      <Box color={'gray'}>{t(e.activityContent)}</Box>
                      <Box color={'gray'}>{moment(e.createdAt).format('LLL')}</Box>
                    </TimelineContent>
                  </TimelineItem>
                )
              })}
            </Timeline>
          </Item>
        </Grid>
        <Grid item md={4} mb={5} xs={12}>
          <Item sx={{ padding: 3 }}>
            <Typography variant='body1' textAlign={'left'}>
              {t('Customer_details')}
            </Typography>
            <Box width={'100%'} display={'flex'} flexDirection={'row'} flex={'start'} mb={2}>
              <Box marginRight={2}>
                <Avatar src={customer?.image} />
              </Box>
              <Box display={'flex'} flexDirection={'column'} justifyContent={'center'}>
                <Box>{customer?.name}</Box>
              </Box>
            </Box>
            <Box width={'100%'} display={'flex'} flexDirection={'row'} flex={'start'} mb={10}>
              <Box display={'flex'} flexDirection={'column'} justifyContent={'center'}>
                <Box>
                  {rows.length} {t('product_order')}
                </Box>
              </Box>
            </Box>
            <Box display={'flex'} flexDirection={'row'} justifyContent={'space-between'} mb={2}>
              <Typography variant='body1'>{t('Contact_info')}</Typography>
            </Box>
            {customer?.email && (
              <Box display={'flex'} flexDirection={'row'} flex={'start'} mb={2}>
                Email:
                <a href={'mailto:' + customer.email} className='ml-5  text-primary'>
                  {customer.email}
                </a>
              </Box>
            )}
            {customer?.phone && (
              <Box display={'flex'} flexDirection={'row'} flex={'start'}>
                {t('phone')}:{' '}
                <a href={'https://wa.me/' + customer?.phone} className='ml-5 text-primary'>
                  {' '}
                  {customer?.phone}
                </a>
              </Box>
            )}
          </Item>
          <Item sx={{ padding: 3, mt: 4 }}>
            <Box display={'flex'} flexDirection={'row'} justifyContent={'space-between'} mb={5}>
              <Typography variant='body1'>{t('delivery_infos')}</Typography>
            </Box>
            <Box display={'flex'} flexDirection={'row'} flex={'start'} mb={2}>
              {t('address')}: {orderData?.deliveryInfo?.address}
            </Box>
            {orderData?.deliveryInfo?.city && orderData?.deliveryInfo?.city != undefined && (
              <Box display={'flex'} flexDirection={'row'} flex={'start'} mb={2}>
                {t('city')}: {orderData?.deliveryInfo?.city}
              </Box>
            )}
            <Box display={'flex'} flexDirection={'row'} flex={'start'} mb={2}>
              {t('dev_date')}: {moment(orderData?.deliveryInfo?.date).format('LLL')}
            </Box>
          </Item>
        </Grid>
      </Grid>
    </Box>
  )
}

export default OrderDetails
