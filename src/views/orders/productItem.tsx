import * as React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { IconButton, MenuItem, Select, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Close } from '@mui/icons-material'

interface Product {
  product: string
  qty: number
  cost: number
  price: number
}

interface ProductItemProps {
  index: number
  item: Product
  handleInputChange: (index: number, event: any) => void
  handleRemoveItem: (index: number) => void
  products: any
}

const ProductItem: React.FC<ProductItemProps> = ({ index, item, handleInputChange, handleRemoveItem, products }) => {
  const { t } = useTranslation('order')

  return (
    <TableContainer component={Paper}>
      <Table aria-label='simple table'>
        <TableHead>
          <TableRow>
            <TableCell>{t('product')}</TableCell>
            <TableCell align='center'>{t('cost')}</TableCell>
            <TableCell align='center'>{t('qty')}</TableCell>
            <TableCell align='right'>{t('price')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
            <TableCell align='left' component='th' scope='row'>
              <Select
                placeholder={`${t('product')}`}
                value={item.product}
                onChange={event => handleInputChange(index, event)}
                name='product'
                defaultValue={products[0]?._id}
                sx={{ width: 120 }}
              >
                {products?.map((product: any) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name}
                  </MenuItem>
                ))}
              </Select>
            </TableCell>
            <TableCell align='center'>
              <TextField fullWidth sx={{ minWidth: 80 }} name='cost' value={item.cost} onChange={event => handleInputChange(index, event)} />
            </TableCell>
            <TableCell align='center'>
              <TextField
                type='number' 
                name='qty'
                value={item.qty}
                inputProps={{ min: 1 }}
                onChange={event => handleInputChange(index, event)}
                className='m-w-50'
                sx={{ minWidth: 80 }}
              />
            </TableCell>

            <TableCell align='right'>
              <TextField fullWidth sx={{ minWidth: 80 }} name='price' value={item.price} />
            </TableCell>
            <TableCell align='right'>
              <IconButton onClick={() => handleRemoveItem(index)}>
                <Close />
              </IconButton>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default ProductItem
