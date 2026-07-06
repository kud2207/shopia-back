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
import Switch from '@mui/material/Switch'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { Avatar, Box, Button, CircularProgress, IconButton } from '@mui/material'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { Add, SwapVert } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { deleteProduct, getProducts, updateProduct } from 'src/@apiCore/npoints'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { toast } from 'react-toastify'
import swal from 'sweetalert'
import { ProductInterface } from 'src/types'
import ImageIcon from '@mui/icons-material/Image'
import InputSearch from 'src/views/search/InputSearch'
import { Object } from 'src/types'
import { useSettings } from 'src/@core/hooks/useSettings'

interface Column {
  id: 'id' | 'category' | 'stock' | 'name' | 'pricing' | 'action' | 'quantity' | 'date' | 'sku'
  label: string
  minWidth?: number
  align?: 'right'
  format?: (value: number) => string
  sort?: boolean
}

const columns: readonly Column[] = [
  { id: 'name', label: 'Name', minWidth: 200 },
  {
    id: 'category',
    label: 'Category',
    align: 'right'
  },
  {
    id: 'stock',
    label: 'Stock',
    align: 'right'
  },
  {
    id: 'quantity',
    label: 'Quantité',
    align: 'right',
    format: (value: number) => value.toLocaleString('en-US'),
    sort: true,
    minWidth: 200
  },
  {
    id: 'pricing',
    label: 'Prix',
    align: 'right',
    format: (value: number) => value.toFixed(2),
    sort: true,
    minWidth: 150
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
      ...(await serverSideTranslations(locale ?? 'fr', ['common', 'product']))
    }
  }
}

const ProductList = () => {
  const { t } = useTranslation('product')
  const router = useRouter()
  const { activeShop } = useGlobalContext()
  const [products, setProducts] = useState<ProductInterface[]>([])
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(5)
  const [count, setCount] = useState(0)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const [selectedId, setSelectedId] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [desc, setDesc] = useState(true)
  const [load, setLoad] = useState(false)
  const [forceReload, setForceReload] = useState(false)
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
      setLoad(true)
      handlegetProduct()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShop, rowsPerPage, sortBy, desc, page, forceReload, search])

  const handlegetProduct = () => {
    let query = `?page=${page + 1}&sortOrder=${desc ? 'desc' : 'asc'}`
    if (rowsPerPage) {
      query += '&limit=' + rowsPerPage
    }
    if (sortBy) {
      query += '&sortBy=' + sortBy
    }

    if (search) query += '&search=' + search

    getProducts(activeShop?._id, query)
      .then(resp => {
        setProducts(resp.data.data)
        setCount(resp.data.pagination?.totalItems)
        setLoad(false)
      })
      .finally(() => setLoad(false))
  }

  const handleSort = (type: string) => {
    setSortBy(type)
    setDesc(!desc)
  }

  const handleUpdate = (item: any) => {
    router.push('/app/products/create?id=' + item._id)
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
          deleteProduct(item._id).then(response => {
            if (response.status == 200) {
              setForceReload(!forceReload)
              toast.success(t('delete_success'))
            } else toast.error(t('error'))
          })
        }
      })
    }
  }

  const handleUpdateInStock = (id: string, in_stock: boolean) => {
    const data = new FormData()
    data.append('in_stock', in_stock ? '1' : '0')
    setProducts(products.map(item => (item._id === id ? { ...item, in_stock: in_stock } : item)))
    updateProduct(id, data)
      .then(response => {
        if (response.status == 200) {
          toast.success(t('success_update'))
        } else toast.error(t('error_update'))
      })
      .catch(() => toast.error(t('error_update')))
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h5'>
          <Link href='#'>{t('my_product')}</Link>
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={6} alignItems={'center'}>
          <Grid item xs={12} sm={5}>
            <InputSearch
              objectName={Object.Product}
              data={products}
              setSearch={val => {
                setSearch(val)
                setPage(0)
              }}
              search={search}
              placeholder={t('name')}
            />
          </Grid>
          <Grid item xs={12} sm={7} display={'flex'} justifyContent={'flex-end'}>
            <Button
              startIcon={<Add />}
              onClick={() => router.push('products/create/')}
              size='large'
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
                    {products?.map((row, index) => {
                      const labelId = `enhanced-table-checkbox-${index}`

                      return (
                        <TableRow hover tabIndex={-1} key={row._id}>
                          <TableCell component='td' id={labelId} scope='row' padding='none'>
                            <Box display='flex' alignItems='center' justifyContent={'space-between'}>
                              <Box display='flex' alignItems='center' justifyContent={'left'}>
                                <Avatar
                                  src={row.images.length > 0 ? row.images[0] : ''}
                                  style={{ borderRadius: 5, height: 50, width: 50 }}
                                >
                                  <ImageIcon />
                                </Avatar>
                                <Box marginLeft={3}>
                                  <Typography fontSize={14} variant='body2' align='left'>
                                    {row.name}
                                  </Typography>
                                </Box>
                              </Box>
                              <IconButton
                                aria-label='more'
                                id='long-button1'
                                aria-controls={open ? 'long-menu' : undefined}
                                aria-expanded={open ? 'true' : undefined}
                                aria-haspopup='true'
                                onClick={event => handleClick(event, row)}
                                className='d-md-none'
                                sx={{ padding: 0 }}
                              >
                                <MoreVertIcon />
                              </IconButton>
                              <Menu
                                id='long-menu1'
                                MenuListProps={{
                                  'aria-labelledby': 'long-button'
                                }}
                                anchorEl={anchorEl}
                                open={open && selectedId === row._id}
                                onClose={handleClose}
                              >
                                <MenuItem onClick={() => handleUpdate(row)}>{t('update')}</MenuItem>
                                <MenuItem sx={{ color: 'red' }} onClick={() => handleDelete(row)}>
                                  {t('delete')}
                                </MenuItem>
                              </Menu>
                            </Box>
                          </TableCell>
                          <TableCell align='center' data-label={t('category')}>
                            {row.category?.fr}
                          </TableCell>
                          <TableCell align='center' data-label={t('in_stock')}>
                            <Switch
                              checked={row.in_stock}
                              onChange={() => handleUpdateInStock(row._id, !row.in_stock)}
                            />
                          </TableCell>
                          <TableCell align='center' data-label={t('quantity')}>
                            {row.quantity}
                          </TableCell>
                          <TableCell align='center' data-label={t('pricing')} className='b-bt-0'>
                            {row.price} {activeShop?.currency}
                          </TableCell>
                          <TableCell align={'center'} className='d-sm-none' data-label={t('Actions')}>
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
                                <MenuItem onClick={() => handleUpdate(row)}>{t('update')}</MenuItem>
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
          </Paper>
        </Card>
      </Grid>
    </Grid>
  )
}

export default ProductList
