// ** React Imports
import { useState, ChangeEvent } from 'react'

// ** MUI Imports
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableRow from '@mui/material/TableRow'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TablePagination from '@mui/material/TablePagination'

interface Column {
  id: 'order' | 'product' | 'customer' | 'address' | 'date'
  label: string
  minWidth?: number
  align?: 'right'
  format?: (value: number) => string
}

const columns: readonly Column[] = [
  { id: 'order', label: 'ISO\u00a0Order', minWidth: 170 },
  { id: 'product', label: 'Product', minWidth: 100 },
  {
    id: 'customer',
    label: 'Customer',
    minWidth: 170,
    align: 'right',
    format: (value: number) => value.toLocaleString('en-US')
  },
  {
    id: 'address',
    label: 'address',
    minWidth: 170,
    align: 'right'
  },
  {
    id: 'date',
    label: 'Date',
    minWidth: 170,
    align: 'right',
    format: (value: number) => value.toFixed(2)
  }
]

interface Data {
  order: string
  product: string
  customer: string
  address: string
  date: string
}

function createData(order: string, product: string, customer: string, address: string, date: string): Data {
  return { order, product, customer, address, date }
}

const rows = [
  createData('#1234', 'India', 'IN', '1324171354', '3287263'),
  createData('#1232', 'China', 'CN', '1403500365', '9596961'),
  createData('#1236', 'Italy', 'IT', '60483973', '301340'),
  createData('#1237', 'United States', 'US', '327167434', '9833520'),
  createData('#1239', 'Canada', 'CA', '37602103', '9984670'),
  createData('#1231', 'Australia', 'AU', '25475400', '7692024'),
  createData('#1222', 'Germany', 'DE', '83019200', '357578'),
  createData('#1245', 'Ireland', 'IE', '4857000', '70273'),
  createData('#1200', 'Mexico', 'MX', '126577691', '1972550'),
  createData('#1258', 'Japan', 'JP', '126317000', '377973'),
  createData('#1235', 'France', 'FR', '67022000', '640679'),
  createData('#1262', 'United Kingdom', 'GB', '67545757', '242495'),
  createData('#1209', 'Russia', 'RU', '146793744', '17098246'),
  createData('#1225', 'Nigeria', 'NG', '200962417', '923768'),
  createData('#1218', 'Brazil', 'BR', '210147125', '8515767')
]

const TableStickyHeader = () => {    
  // ** States
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value)
    setPage(0)
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{}}>
        <Table stickyHeader aria-label='sticky table'>
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell key={column.id} align={column.align} sx={{ minWidth: column.minWidth }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => {
              return (
                <TableRow hover role='checkbox' tabIndex={-1} key={row.order}>
                  {columns.map(column => {
                    const value = row[column.id]

                    return (
                      <TableCell key={column.id} align={column.align}>
                        {column.format && typeof value === 'number' ? column.format(value) : value}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component='div'
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  )
}

export default TableStickyHeader
