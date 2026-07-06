import * as React from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import { visuallyHidden } from '@mui/utils'
import { useTranslation } from 'react-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { getShopClientsRequest } from 'src/@apiCore/npoints'
import { t } from 'i18next'
import { Avatar, CircularProgress, Paper, Typography } from '@mui/material'
import { Object } from 'src/types'
import InputSearch from 'src/views/search/InputSearch'
import { useSettings } from 'src/@core/hooks/useSettings'

export async function getServerSideProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common', 'shop']))
    }
  }
}

interface Data {
  id: string
  name: string
  surname: string
  phone: number
  email: string
  order_number: number
  customer: any
  count: number
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
  const { t } = useTranslation('shop')
  const headCells: readonly HeadCell[] = [
    {
      id: 'name',
      numeric: false,
      disablePadding: true,
      label: t('name')
    },
    {
      id: 'phone',
      numeric: true,
      disablePadding: false,
      label: t('phone')
    },
    {
      id: 'email',
      numeric: true,
      disablePadding: false,
      label: t('email')
    },
    {
      id: 'order_number',
      numeric: true,
      disablePadding: false,
      label: t('order_number')
    }
  ]

  const { order, orderBy, onRequestSort } = props
  const createSortHandler = (property: keyof Data) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property)
  }

  return (
    <TableHead>
      <TableRow>
        {headCells.map(headCell => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
            sx={{ minWidth: 170, flexDirection: 'row' }}
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

const ShopClients = () => {
  const { t } = useTranslation('shop')
  const [order, setOrder] = React.useState<Order>('asc')
  const [orderBy, setOrderBy] = React.useState<keyof Data>('order_number')
  const [selected, setSelected] = React.useState<readonly number[]>([])
  const [page, setPage] = React.useState(0)
  const [count, setCount] = React.useState(0)
  const [rows, setRows] = React.useState<any>([])
  const [rowsPerPage, setRowsPerPage] = React.useState(5)
  const { activeShop } = useGlobalContext()
  const [load, setLoad] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const { settings } = useSettings()
  React.useEffect(() => {
    handleGetShops(page, order, rowsPerPage, orderBy, activeShop, rows, setRows, setCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShop, order, orderBy, page, rowsPerPage, search])

  const isSelected = (id: any) => selected.indexOf(id) !== -1

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0

  const visibleRows: any = React.useMemo(
    () => stableSort(rows, getComparator(order, orderBy)).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [order, orderBy, page, rowsPerPage, rows]
  )

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
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

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = rows.map((n: any) => n.id)
      setSelected(newSelected)

      return
    }
    setSelected([])
  }

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof Data) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleGetShops = (
    page: number,
    order: string,
    rowsPerPage: number,
    orderBy: keyof Data,
    activeShop: any,
    rows: Data[],
    setRows: any,
    setCount: any
  ) => {
    let query = `?page=${page + 1}&sortOrder=${order}`
    if (rowsPerPage) {
      query += '&limit=' + rowsPerPage
    }
    if (orderBy) {
      query += '&sortBy=' + orderBy
    }
    if (search) query += '&search=' + search
    if (activeShop?._id) {
      getShopClientsRequest(activeShop._id, query)
        .then((response: any) => {
          setRows(response.data.data)
          setCount(response.data.pagination.totalItems)
        })
        .finally(() => setLoad(false))
    }
  }

  return (
    <Grid item xs={12}>
      <Box mb={3}>
        <Typography variant='h4'>{t('client_linked_title')}</Typography>
      </Box>
      <Grid item xs={12}>
        <Grid container spacing={16} display={'flex'}>
          <Grid item xs={12} sm={5} justifyContent={'flex-start'}>
            <InputSearch
              objectName={Object.Client}
              data={[]}
              setSearch={val => {
                setSearch(val)
                setPage(0)
              }}
              search={search}
              placeholder={t('first_or_lastname')}
            />
          </Grid>
        </Grid>
      </Grid>
      <Paper sx={{ mt: 5 }} className={'responsiveTable-' + settings?.mode}>
        <TableContainer>
          <Table sx={{ marginTop: 2 }} aria-labelledby='tableTitle' size={'medium'}>
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={count}
            />

            <TableBody>
              {load && (
                <TableRow>
                  <TableCell colSpan={10} align='center'>
                    <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                      <CircularProgress size={40} color='inherit' />
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {visibleRows.map((row: any, index: number) => {
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
                    <TableCell id={labelId}>
                      <Box display='flex' alignItems='center' justifyContent={'left'}>
                        <Avatar src={row?.customer[0]?.image}>{row.customer[0]?.name?.slice(0, 1)}</Avatar>
                        <Box marginLeft={2}>
                          <Typography fontSize={14} align='left' sx={{ textTransform: 'uppercase' }}>
                            {row.customer[0]?.name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell data-label={t('phone')}>{row.customer[0]?.phone}</TableCell>
                    <TableCell data-label={t('email')}>{row.customer[0]?.email}</TableCell>
                    <TableCell align='center' data-label={t('order_number')}>
                      {row.count}
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
      </Paper>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component='div'
        count={count}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage='Pages'
      />
    </Grid>
  )
}

export default ShopClients
