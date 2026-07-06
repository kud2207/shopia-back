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
import { Avatar, Box, Button, Chip, CircularProgress, IconButton } from '@mui/material'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { Add, SwapVert } from '@mui/icons-material'
import { makeStyles } from '@mui/styles'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { deletePaymentRequest, getPaymentRequest, updatePaymentRequest } from 'src/@apiCore/npoints'
import moment from 'moment'
import { CheckCircle, Cancel, HourglassEmpty } from '@mui/icons-material' // Import icons
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Backdrop from '@mui/material/Backdrop'
import Modal from '@mui/material/Modal'
import Fade from '@mui/material/Fade'
import { toast } from 'react-toastify'
import swal from 'sweetalert'
import { PaymentInterface } from 'src/types'
import PaymentRequestForm from './create'

import 'moment/locale/fr'
import { Object } from 'src/types'
import { useSettings } from 'src/@core/hooks/useSettings'
import { isMobile } from 'react-device-detect'

moment.locale('fr')

interface Column {
  id: 'amount' | 'payment_method' | 'status' | 'date' | 'action'
  label: string
  minWidth?: number
  align?: 'right'
  format?: (value: number) => string
  sort?: boolean
}

const columns: readonly Column[] = [
  { id: 'amount', label: 'Amount', minWidth: 170 },
  {
    id: 'payment_method',
    label: 'Méthode paiement',
    align: 'right'
  },
  {
    id: 'date',
    label: 'Date',
    align: 'right',
    format: (value: number) => value.toFixed(2),
    sort: true
  },
  {
    id: 'status',
    label: 'status',
    align: 'right',
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
      ...(await serverSideTranslations(locale ?? 'fr', ['common', 'payment_request']))
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

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: isMobile ? '90%' : '28rem',
  bgcolor: 'background.paper',
  boxShadow: 24
}

const Payments = () => {
  const { t } = useTranslation('payment_request')
  const router = useRouter()
  const { user } = useGlobalContext()
  const [payments, setPayments] = useState<PaymentInterface[]>([])
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [count, setCount] = useState(0)
  const classes = useStyles()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const [selectedId, setSelectedId] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [desc, setDesc] = useState(true)
  const [load, setLoad] = useState(false)
  const [forceReload, setForceReload] = useState(false)
  const [selectedItem, setSeletedItem] = useState<PaymentInterface | null>()
  const [action, setAction] = useState('CREATE')
  const [openForm, setOpenForm] = useState(false)
  const { settings } = useSettings()

  const handleOpenForm = () => {
    setOpenForm(true)
  }
  const handleCloseForm = () => {
    setOpenForm(false)
    handleClose()
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>, item: any) => {
    setSelectedId(item._id)
    setSeletedItem(item)
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
    if (user?._id) {
      setLoad(true)
      handlegetPaymentRequest()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, rowsPerPage, sortBy, desc, page, forceReload])

  const handlegetPaymentRequest = () => {
    let query = `?page=${page + 1}&sortOrder=${desc ? 'desc' : 'asc'}`
    if (rowsPerPage) {
      query += '&limit=' + rowsPerPage
    }
    if (sortBy) {
      query += '&sortBy=' + sortBy
    }

    if (user?.role == 'admin') {
      query += '&isAdmin=1'
    }

    getPaymentRequest(user?._id, query)
      .then(resp => {
        console.log('payment ', resp)

        setPayments(resp.data.data)
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

      case 'paid':
        return 'success'
      case 'cancelled':
        return 'error'
      default:
        return 'warning'
    }
  }

  const countPaymentsByStatus = (status: string): number => {
    return payments?.reduce((count, payment) => {
      if (payment.status === status) {
        return count + 1
      }

      return count
    }, 0)
  }

  const handleUpdate = (item: any) => {
    setSeletedItem(item)
    setAction('UPDATE')
    handleOpenForm()
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
          deletePaymentRequest(item._id).then(response => {
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
    updatePaymentRequest(id, { status: status, isStatus: true })
      .then(response => {
        if (response.status == 200) {
          toast.success(t('success_modify'))
          setForceReload(!forceReload)
          setAnchorEl(null)
        } else toast.error(t('error_update'))
      })
      .catch(() => toast.error(t('error_update')))
      .finally(() => setLoad(false))
  }

  return (
    <>
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Typography variant='h5'>
            <Link href='#'>{t('my_payments_requests')}</Link>
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={classes.paper}>
                <Typography variant='h6'>{t('pending_payment')}</Typography>
                <Typography variant='h4'>{countPaymentsByStatus('processing')}</Typography>
                <IconButton className={classes.icon}>
                  <HourglassEmpty />
                </IconButton>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={classes.paper}>
                <Typography variant='h6'>{t('completed_payment')}</Typography>
                <Typography variant='h4'>{countPaymentsByStatus('paid')}</Typography>
                <IconButton className={classes.icon}>
                  <CheckCircle />
                </IconButton>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={classes.paper}>
                <Typography variant='h6'>{t('refused_payment')}</Typography>
                <Typography variant='h4'>{countPaymentsByStatus('cancelled')}</Typography>
                <IconButton className={classes.icon}>
                  <Cancel />
                </IconButton>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={6} alignItems={'center'}>
            <Grid item xs={12} display={'flex'} justifyContent={'flex-end'}>
              <Button
                startIcon={<Add />}
                onClick={() => {
                  setSeletedItem(null)
                  setAction('CREATE')
                  handleOpenForm()
                }}
                size='medium'
                variant='contained'
                sx={{ textTransform: 'initial' }}
              >
                {t('add_title')}
              </Button>
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
                        {' '}
                        <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                          <CircularProgress size={40} color='inherit' />
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                  {!load && (
                    <TableBody>
                      {payments?.map((row, index) => {
                        return (
                          <TableRow hover tabIndex={-1} key={row._id}>
                            <TableCell align={'center'} data-label={t('amount')}>
                              ${row?.amount}
                            </TableCell>
                            <TableCell align={'center'} data-label={t('payment_method')}>
                              {row?.paymentMethod}
                            </TableCell>
                            <TableCell align={'center'} data-label={t('date')}>
                              {moment(row?.createdAt).format('LL')}
                            </TableCell>
                            <TableCell align={'center'} data-label={t('status')}>
                              <Chip
                                label={t(`${row?.status}`)}
                                color={getStatusColor(row?.status)}
                                sx={{
                                  height: 24,
                                  fontSize: '0.75rem',
                                  textTransform: 'capitalize',
                                  '& .MuiChip-label': { fontWeight: 500 }
                                }}
                              />
                            </TableCell>
                            <TableCell align={'center'} data-label={t('Actions')}>
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
                                    <MenuItem onClick={() => handleStatus(row._id, 'cancelled')}>
                                      {t(`cancel`)}
                                    </MenuItem>
                                  )}
                                  {row.status === 'processing' && user?.role == 'admin' && (
                                    <MenuItem onClick={() => handleStatus(row._id, 'paid')}>
                                      {t(`completed_payment`)}
                                    </MenuItem>
                                  )}
                                  {row.status === 'cancelled' && user?.role == 'admin' && (
                                    <MenuItem onClick={() => handleStatus(row._id, 'processing')}>
                                      {t(`processing`)}
                                    </MenuItem>
                                  )}
                                  {row.status != 'processing' && row.status != 'paid' && (
                                    <>
                                      <MenuItem onClick={() => handleUpdate(row)}>{t('update')}</MenuItem>
                                      <MenuItem sx={{ color: 'red' }} onClick={() => handleDelete(row)}>
                                        {t('delete')} {row.status}
                                      </MenuItem>
                                    </>
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
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 100]}
                component='div'
                count={count}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage='pages'
              />
            </Paper>
          </Card>
        </Grid>
      </Grid>
      <Modal
        aria-labelledby='transition-modal-title'
        aria-describedby='transition-modal-description'
        open={openForm}
        onClose={handleCloseForm}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500
          }
        }}
      >
        <Fade in={openForm}>
          <Box sx={style}>
            <PaymentRequestForm
              handleActionCompleted={handleCloseForm}
              action={action}
              data={selectedItem}
              paymentList={payments}
              updatePaymentList={setPayments}
            />
          </Box>
        </Fade>
      </Modal>
    </>
  )
}

export default Payments
