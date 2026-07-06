// ** MUI Imports
import Grid from '@mui/material/Grid'
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
import { Box, Button, CircularProgress, IconButton } from '@mui/material'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { Add, SwapVert } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { getDelivraryServices, updateDeliveryService } from 'src/@apiCore/npoints'
import StoreCogOutline from 'mdi-material-ui/StoreCogOutline'
import swal from 'sweetalert'
import { TrashCan, NoteEdit } from 'mdi-material-ui'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import { useSettings } from 'src/@core/hooks/useSettings'

interface Column {
  id: 'name' | 'description' | 'ville' | 'zone' | 'prix_max' | 'prix_min' | 'action'
  label: string
  minWidth?: number
  align?: 'right'
  format?: (value: number) => string
  sort?: boolean
}

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['delivery_service', 'common']))
    }
  }
}

interface Delivrary {
  _id: string
  name: string
  description: string
  city: any
  deliveryZonnes: any
  minPrice: number
  maxPrice: number
  currency: string
}

const DelivryService = () => {
  const { t } = useTranslation('delivery_service')

  const columns: readonly Column[] = [
    { id: 'name', label: t('name'), minWidth: 170 },
    {
      id: 'description',
      label: t('description'),
      align: 'right',
      format: (value: number) => value.toLocaleString('en-US')
    },
    {
      id: 'ville',
      label: t('city'),
      align: 'right',
      format: (value: number) => value.toFixed(2),
      sort: false
    },
    {
      id: 'zone',
      label: t('delivery_zones'),
      minWidth: 170,
      align: 'right',
      sort: false
    },
    {
      id: 'prix_max',
      label: t('min_price'),
      align: 'right'
    },
    {
      id: 'prix_min',
      label: t('max_price'),
      align: 'right'
    },
    {
      id: 'action',
      label: t('Actions'),
      align: 'right'
    }
  ]

  const { activeShop, user } = useGlobalContext()
  const [delivraries, setDelivraries] = useState<Delivrary[]>([])
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [count, setCount] = useState(0)
  const [sortBy, setSortBy] = useState('date')
  const [desc, setDesc] = useState(true)
  const [load, setLoad] = useState(false)
  const [forceReload, setForceReload] = useState(false)
  const {settings} = useSettings()
  const router = useRouter()
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value)
    setPage(0)
  }

  useEffect(() => {
    setLoad(true)
    handleGetSetvices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShop, rowsPerPage, sortBy, desc, page, user, forceReload])

  const handleGetSetvices = () => {
    let query = `?page=${page + 1}&sortOrder=${desc ? 'desc' : 'asc'}`
    if (rowsPerPage) {
      query += '&limit=' + rowsPerPage
    }
    if (sortBy) {
      query += '&sortBy=' + sortBy
    }
    if (user?._id) {
      getDelivraryServices(user?._id, query)
        .then((response: any) => {
          if (response.status == 200) {
            setDelivraries(response.data.data)
            setCount(response.data.pagination.totalItems)
          }
        })
        .catch(err => {
          setLoad(false)
          console.log(err)
        })
        .finally(() => setLoad(false))
    }
  }

  const handleSort = (type: string) => {
    setSortBy(type)
    setDesc(!desc)
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
          const data = new FormData()
          setLoad(true)
          data.append('isDelete', '1')
          updateDeliveryService(item._id, data).then(response => {
            if (response.status == 200) {
              setForceReload(!forceReload)
              toast.success(t('delete_success'))
            } else toast.error(t('error'))
          })
        }
      })
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} display={'flex'} className="d-sm-block" justifyContent={'space-between'}>
        <Typography variant='h5'>{t('my_delivry_service')}</Typography>
        <Button
          startIcon={<Add />}
          onClick={() => router.push('delivery_services/create')}
          size='medium'
          variant='contained'
          sx={{ textTransform: 'initial', mt:4 }}
        >
          {t('add1')}
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Card className={'responsiveTable-' + settings?.mode}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }} className={'responsiveTable-' + settings?.mode}>
            <TableContainer>
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
                        {' '}
                        <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                          <CircularProgress size={40} color='inherit' />
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                {!load && (
                  <TableBody>
                    {delivraries?.map((row, index) => {
                      return (
                        <TableRow hover tabIndex={-1} key={index}>
                          <TableCell>
                            <Typography variant='body1' style={{textAlign:"left"}}>{row.name}</Typography>
                          </TableCell>
                          <TableCell >
                            <Typography variant='body2' style={{textAlign:"left"}}>{row.description}</Typography>
                          </TableCell>
                          <TableCell align={'center'} data-label={t('city')}>
                            <span>{row.city?.name}</span>
                          </TableCell>
                          <TableCell align={'center'} data-label={t('delivery_zones')}>
                            <span>{row.deliveryZonnes?.toString()}</span>
                          </TableCell>
                          <TableCell align={'center'} data-label={t('min_price')}>
                            <span>
                              {row.minPrice} {row.currency}
                            </span>
                          </TableCell>
                          <TableCell align={'center'} data-label={t('max_price')}>
                            <span>
                              {row.maxPrice} {row.currency}
                            </span>
                          </TableCell>
                          <TableCell  data-label={t('Actions')}>
                            <Box display={'flex'} justifyContent={"end"}>
                              <IconButton
                                onClick={() => router.push('delivery_services/' + row._id)}
                              >
                                <StoreCogOutline />
                              </IconButton>
                              <IconButton
                                onClick={() => router.push('delivery_services/create?id=' + row._id)}
                              >
                                <NoteEdit />
                              </IconButton>
                              <IconButton
                                onClick={() => handleDelete(row)}
                                color='error'
                              >
                                <TrashCan />
                              </IconButton>
                            </Box>
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
              labelRowsPerPage="Pages"
            />
          </Paper>
        </Card>
      </Grid>
    </Grid>
  )
}

export default DelivryService
