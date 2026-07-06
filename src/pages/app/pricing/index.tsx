import { Add, Delete, Edit } from '@mui/icons-material'
import { Autocomplete, Box, Button, Card, CircularProgress, Grid, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { useSettings } from 'src/@core/hooks/useSettings'
import swal from 'sweetalert'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['pricing']))
    }
  }
}

const PricingList = () => {

    const { t, i18n } = useTranslation('pricing')
    const { activeShop } = useGlobalContext()
    const { settings } = useSettings()
    const [pricings, setPricings] = useState<any[]>([])
    const [forceReload, setForceReload] = useState(false)
    const [rowsPerPage, setRowsPerPage] = useState<number>(5)
    const [page, setPage] = useState<number>(0)
    const [count, setCount] = useState<number>(0)
    const [load, setLoad] = useState(false)
    // const typeList = ['marchand', 'livreur', 'partenaire']
    const router = useRouter()

    useEffect(() => {
        if (activeShop?._id) {
        setLoad(true)
            handleGetPricing()
        }
    }, [activeShop, page, forceReload, rowsPerPage])

    const handleGetPricing = () => {
    
    let query = `page=${page + 1}&limit=${rowsPerPage}`
    
    // getPricing(query)
    //   .then(response => {
    //     setFaqs(response?.data?.data || [])
    //     setCount(response?.data?.total || 0)
    //   })
    //   .finally(() => setLoad(false))
    setLoad(false)
  }

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value)
        setPage(0)
    }

    const handleDeleteFaq = (price) => {
    // delete operation
    if (price._id.length > 0) {
      swal({
        title: '',
        text: t('delete_text') + '',
        icon: 'error',
        buttons: [t('cancel') + '', t('delete') + ''],
        dangerMode: true
      }).then(willDelete => {
        // if (willDelete) {
        //   deletePrice(faq._id).then(response => {
        //     if (response.status == 200) {
        //       setForceReload(!forceReload)
        //       toast.success(t('delete_success'))
        //     } else toast.error(t('delete_error'))
        //   })
        // }
      })
    }
  }

    return (
        <Grid container spacing={6}>
            <Grid item xs={12}>
                <Typography variant='h4'>
                    {t('pricing_title')}
                </Typography>
            </Grid>
            <Grid item xs={12} sx={{display: 'flex', justifyContent: 'flex-end'}}>
                <Button
                    startIcon={<Add />}
                    onClick={() => router.push('pricing/create/')}
                    size='large'
                    variant='contained'
                    sx={{ textTransform: 'initial' }}
                >
                    {t('add_pricing')}
                </Button>
            </Grid>
            <Grid item xs={12}>
                <Card className={'responsiveTable-' + settings?.mode}>
                    <Paper sx={{ width: '100%', overflow: 'hidden' }} className={'responsiveTable-' + settings?.mode}>
                        <TableContainer sx={{}}>
                            <Table stickyHeader aria-label='sticky table'>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            {t('name')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            {t('price')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            {t('duration')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            {t('country')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            {t('type')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            {t('shop_num')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            {t('include_bot')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            Action
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {load ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align='center'>
                                            {' '}
                                            <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                                                <CircularProgress size={40} color='inherit' />
                                            </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : pricings.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align='center' >
                                                {t('no_element')}
                                            </TableCell>
                                        </TableRow>
                                    ) : pricings.map((price) => (
                                        <TableRow hover key={price?._id}>
                                            <TableCell>
                                                {price?.name}
                                            </TableCell>
                                            <TableCell>
                                                {price?.price}
                                            </TableCell>
                                            <TableCell>
                                                {price?.duration}
                                            </TableCell>
                                            <TableCell>
                                                {price?.country[i18n.language || 'fr']}
                                            </TableCell>
                                            <TableCell>
                                                {price?.type}
                                            </TableCell>
                                            <TableCell>
                                                {price?.type}
                                            </TableCell>
                                            <TableCell>
                                                {price?.isBot}
                                            </TableCell>
                                            <TableCell align='center'>
                                                <Box sx={{display: 'flex', justifyContent: 'center'}}> 
                                                    <IconButton onClick={() => router.push(`pricing/create?id=${price?._id}`)} aria-label="update">
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton aria-label="delete" onClick={() => handleDeleteFaq(price)}>
                                                        <Delete sx={{color: 'red'}} />
                                                    </IconButton>
                                            </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
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

export default PricingList