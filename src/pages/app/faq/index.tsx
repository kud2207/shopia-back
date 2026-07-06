import { Add, Delete, Edit } from '@mui/icons-material'
import { Autocomplete, Box, Button, Card, CircularProgress, Grid, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { deleteFaq, getAllFaqs, getFaqs } from 'src/@apiCore/npoints'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { useSettings } from 'src/@core/hooks/useSettings'
import { FaqInterface } from 'src/types'
import swal from 'sweetalert'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['faq']))
    }
  }
}

const FaqList = () => {

    const { t } = useTranslation('faq')
    const { activeShop } = useGlobalContext()
    const { settings } = useSettings()
    const [faqs, setFaqs] = useState<FaqInterface[]>([])
    const [forceReload, setForceReload] = useState(false)
    const [rowsPerPage, setRowsPerPage] = useState<number>(5)
    const [page, setPage] = useState<number>(0)
    const [count, setCount] = useState<number>(0)
    const [load, setLoad] = useState(false)
    const [type, setType] = useState<null|string>('')
    const typeList = ['marchand', 'livreur', 'partenaire']
    const router = useRouter()

    useEffect(() => {
        if (activeShop?._id) {
        setLoad(true)
            handleGetFaq()
        }
    }, [activeShop, page, forceReload, type, rowsPerPage])

    const handleGetFaq = () => {
    console.log(type)
    let query = `page=${page + 1}&limit=${rowsPerPage}`
    if(type) query += `&type=${type}`
    getAllFaqs(query)
      .then(response => {
        setFaqs(response?.data?.data || [])
        setCount(response?.data?.total || 0)
      })
      .finally(() => setLoad(false))
  }

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value)
        setPage(0)
    }

    const handleDeleteFaq = (faq:FaqInterface) => {
    // delete operation
    if (faq._id.length > 0) {
      swal({
        title: '',
        text: t('delete_text') + '',
        icon: 'error',
        buttons: [t('cancel') + '', t('delete') + ''],
        dangerMode: true
      }).then(willDelete => {
        if (willDelete) {
          deleteFaq(faq._id).then(response => {
            if (response.status == 200) {
              setForceReload(!forceReload)
              toast.success(t('delete_success'))
            } else toast.error(t('delete_error'))
          })
        }
      })
    }
  }

    return (
        <Grid container spacing={6}>
            <Grid item xs={12}>
                <Typography variant='h4'>
                    {t('faq_title')}
                </Typography>
            </Grid>
            <Grid item md={6} xs={12}>
                <Autocomplete
                    disablePortal
                    value={type}
                    onChange={(event: any, newValue: null|string) => setType(newValue)}
                    options={typeList}
                    sx={{ width: 300 }}
                    renderInput={(params) => <TextField {...params} placeholder={t('type_placeholder')+''} />}
                />
            </Grid>
            <Grid item xs={12} md={6} sx={{display: 'flex', justifyContent: 'flex-end'}}>
                <Button
                    startIcon={<Add />}
                    onClick={() => router.push('faq/create/')}
                    size='large'
                    variant='contained'
                    sx={{ textTransform: 'initial' }}
                >
                    {t('add_faq')}
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
                                            {t('title_french')}
                                        </TableCell>
                                        <TableCell>
                                            {t('title_english')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            {t('content_french')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            {t('content_english')}
                                        </TableCell>
                                        <TableCell>
                                            {t('type')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            Action
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {load ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align='center'>
                                            {' '}
                                            <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                                                <CircularProgress size={40} color='inherit' />
                                            </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : faqs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align='center' >
                                                {t('no_element')}
                                            </TableCell>
                                        </TableRow>
                                    ) : faqs.map((faq:FaqInterface) => (
                                        <TableRow hover key={faq?._id}>
                                            <TableCell>
                                                {faq?.title?.fr}
                                            </TableCell>
                                            <TableCell>
                                                {faq?.title?.en}
                                            </TableCell>
                                            <TableCell align='justify'>
                                                {faq?.content?.fr}
                                            </TableCell>
                                            <TableCell align='justify'>
                                                {faq?.content?.en}
                                            </TableCell>
                                            <TableCell>
                                                {faq?.type}
                                            </TableCell>
                                            <TableCell align='center'>
                                                <Box sx={{display: 'flex', justifyContent: 'center'}}> 
                                                    <IconButton onClick={() => router.push(`faq/create?id=${faq?._id}`)} aria-label="update">
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton aria-label="delete" onClick={() => handleDeleteFaq(faq)}>
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

export default FaqList