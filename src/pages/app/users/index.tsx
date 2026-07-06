'use client'
import React, { ChangeEvent, useEffect, useState } from 'react'

import Link from 'next/link'
import swal from 'sweetalert'
import ImageIcon from '@mui/icons-material/Image'

import { toast } from 'react-toastify'
import { deleteUser, getUsers } from 'src/@apiCore/npoints'
import { TagsInput } from 'react-tag-input-component'
import {
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography
} from '@mui/material'
import { useSettings } from 'src/@core/hooks/useSettings'
import { Add } from '@mui/icons-material'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useGlobalContext } from 'src/@core/context/globalContext'

const columns: any = [
  {
    id: 'last_name',
    label: 'country',
    align: 'right'
  },
  { id: 'email', label: 'email' },
  {
    id: 'phone',
    label: 'phone'
  },
  {
    id: 'type_account',
    label: 'type_account'
  },
  {
    id: 'shops',
    label: 'shops'
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
      ...(await serverSideTranslations(locale ?? 'fr', ['common', 'account']))
    }
  }
}
const Users = () => {
  const { t, i18n } = useTranslation('account')

  const [data, setData] = React.useState<any[]>([])
  const [load, setLoad] = React.useState(false)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(5)
  const [count, setCount] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [forceReload, setForceReload] = useState(false)
  const { settings } = useSettings()
  const { activeShop } = useGlobalContext()
  const router = useRouter()
  const open = Boolean(anchorEl)
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
    if (activeShop) handlegetProduct()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsPerPage, page, forceReload, activeShop])

  const handlegetProduct = () => {
    let query = `?page=${page + 1}&shop=${activeShop._id}`
    if (rowsPerPage) {
      query += '&limit=' + rowsPerPage
    }

    getUsers(query)
      .then(resp => {
        setData(resp.data.data)
        setCount(resp.data?.total||0)
        setLoad(false)
      })
      .finally(() => setLoad(false))
  }

  const handleUpdate = (item: any) => {
    router.push('/app/users/create?id=' + item._id)
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
          deleteUser(item._id).then(response => {
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
      <Grid item xs={12}>
        <Grid container spacing={6} alignItems={'center'}>
          <Grid item xs={5}>
            <Typography variant='h5'>
              <Link href='#'>{t('manage_user')}</Link>
            </Typography>
          </Grid>
          <Grid item xs={12} sm={7} display={'flex'} justifyContent={'flex-end'}>
            <Button
              startIcon={<Add />}
              onClick={() => router.push('users/create/')}
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
                    {data?.map((row, index) => {
                      const labelId = `enhanced-table-checkbox-${index}`

                      return (
                        <TableRow hover tabIndex={-1} key={row._id}>
                       <TableCell component='td' id={labelId} scope='row' padding='none'>
                            <Box display='flex' alignItems='center' justifyContent={'space-between'}>
                              <Box display='flex' alignItems='center' justifyContent={'left'}>
                                <Avatar
                                  src={row.image}
                                  style={{ borderRadius: 5, height: 50, width: 50 }}
                                >
                                  <ImageIcon />
                                </Avatar>
                                <Box marginLeft={3}>
                                  <Typography fontSize={14} variant='body2' align='left'>
                                  {row.last_name} {row.first_name}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align='center' data-label={t('city')}>
                            {row.email}
                          </TableCell>
                          <TableCell
                            component='td'
                            id={labelId}
                            scope='row'
                            data-label={t('zone_title')}
                            padding='none'
                          >
                            {row.phone}
                          </TableCell>
                          <TableCell
                            component='td'
                            id={labelId}
                            scope='row'
                            data-label={t('type_account')}
                            padding='none'
                          >
                           {t(row.role)}
                          </TableCell>
                          <TableCell align='center' data-label={t('shops')} className='b-bt-0'>
                            <TagsInput
                              classNames={{ input: 'rti--input d-none' }}
                              value={row.shops?.map(i=>i.name) || []}
                              placeHolder=''
                              isEditOnRemove
                              disabled
                            />
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

export default Users
