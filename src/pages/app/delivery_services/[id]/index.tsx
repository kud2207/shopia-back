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
import { Button, CircularProgress, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import { getDeliveryServiceById, updateShopDeliveryService } from 'src/@apiCore/npoints'
import { useTranslation } from 'react-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { toast } from 'react-toastify'

export async function getServerSideProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['delivery_service', 'common']))
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

interface HeadCell {
  disablePadding: boolean
  id: keyof Data
  label: string
  numeric: boolean
}

function EnhancedTableHead() {
  const { t } = useTranslation('delivery_service')
  const headCells: readonly HeadCell[] = [
    {
      id: 'Products',
      numeric: false,
      disablePadding: true,
      label: t('shop')
    },
    {
      id: 'Price',
      numeric: false,
      disablePadding: false,
      label: t('contact_info')
    },
    {
      id: 'Quantity',
      numeric: false,
      disablePadding: false,
      label: t('status')
    },
    {
      id: 'Total',
      numeric: false,
      disablePadding: false,
      label: t('actions')
    }
  ]

  return (
    <TableHead>
      <TableRow>
        {headCells.map(headCell => (
          <TableCell key={headCell.id} align={'left'} padding={headCell.disablePadding ? 'none' : 'normal'}>
            <TableSortLabel>{headCell.label}</TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  )
}

const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'left',
  color: theme.palette.text.secondary
}))

const ServiceDetails = () => {
  const [page, setPage] = React.useState(0)
  const [rows, setRows] = React.useState<any[]>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(5)
  const [load, setLoad] = React.useState(false)
  const [currentId, setCurrentId] = React.useState('')
  const [reload, setReload] = React.useState(false)
  const [load1, setLoad1] = React.useState(true)

  const router = useRouter()

  const { id } = router.query

  const { t } = useTranslation('delivery_service')

  const getData = (id: any) => {
    setLoad1(true)
    getDeliveryServiceById(id)
      .then(data => {
        if (data.status == 200) {
          setRows(data.data.data?.shops?.reverse())
        }
      })
      .finally(() => setLoad1(false))
  }

  React.useEffect(() => {
    if (id) {
      getData(id)
    }
  }, [id, reload])

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0

  const visibleRows = React.useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, rows]
  )

  const handleSubmit = async (serviceId: string, status: string) => {
    const data = new FormData()
    setCurrentId(serviceId)
    setLoad(true)
    data.append('status', status)

    updateShopDeliveryService(serviceId, data)
      .then(response => {
        if (response.status == 200) {
          toast.success(t('saved'))
          setReload(!reload)
        } else toast.error(t('error'))
      })
      .catch(() => toast.error(t('error')))
      .finally(() => setLoad(false))
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box>
        <Typography variant='h4'>{t('shops')}</Typography>
      </Box>
      <Grid style={{ height: 'auto', display: 'flex' }} container spacing={2} mt={5}>
        <Grid item xs={12} md={12}>
          <Item sx={{ padding: 4 }}>
            <Box>
              <Paper sx={{ mb: 2 }}>
                <TableContainer>
                  <Table sx={{ minWidth: 500 }} aria-labelledby='tableTitle' size={'medium'}>
                    <EnhancedTableHead />
                    <TableBody>
                      {load1 && (
                        <TableRow>
                          <TableCell colSpan={5} align='center'>
                            {' '}
                            <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                              <CircularProgress size={40} color='inherit' />
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                      {!load1 &&
                        visibleRows.map((row, index) => {
                          const labelId = `enhanced-table-checkbox-${index}`

                          return (
                            <TableRow hover role='checkbox' tabIndex={-1} key={row.id} sx={{ cursor: 'pointer' }}>
                              <TableCell component='th' id={labelId} scope='row' padding='none'>
                                {row?.shop?.name}
                              </TableCell>
                              <TableCell>{row.shop?.phone}</TableCell>
                              <TableCell>
                                <Typography
                                  sx={{color: row.status == 'refuse' ? 'red': row.status == 'validate' ? "greenyellow" : 'currentcolor'}}
                                  
                                  variant='body1'
                                >
                                  {t(row.status)}
                                </Typography>
                              </TableCell>
                              <TableCell align='right'>
                                {row.status == 'waiting' && (
                                  <>
                                    <Button
                                      variant='contained'
                                      disabled={load}
                                      size='small'
                                      onClick={() => handleSubmit(row._id, 'validate')}
                                    >
                                      {t('accept')}
                                      {load && currentId == row._id && (
                                        <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />
                                      )}
                                    </Button>
                                    <Button
                                      variant='contained'
                                      disabled={load}
                                      color='error'
                                      size='small'
                                      onClick={() => handleSubmit(row._id, 'refuse')}
                                      sx={{ ml: 4 }}
                                    >
                                      {t('refuse')}
                                      {load && currentId == row._id && (
                                        <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />
                                      )}
                                    </Button>
                                  </>
                                )}
                              </TableCell>
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
                />
              </Paper>
            </Box>
          </Item>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ServiceDetails
