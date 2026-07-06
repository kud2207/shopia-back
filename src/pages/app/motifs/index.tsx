import { Add, Delete, Edit } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Grid,
  IconButton,
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
import { useRouter } from 'next/router'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import swal from 'sweetalert'
import { useSettings } from 'src/@core/hooks/useSettings'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { deleteMotif, getMotifs } from 'src/@apiCore/npoints'
import { useGlobalContext } from 'src/@core/context/globalContext'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['motif', 'common']))
    }
  }
}

const MotifList = () => {
  const { t } = useTranslation('motif')
  const router = useRouter()
  const { activeShop } = useGlobalContext()
  const [page, setPage] = useState<number>(0)
  const [count, setCount] = useState<number>(0)
  const { settings } = useSettings()
  const [motifs, setMotifs] = useState([])
  const [forceReload, setForceReload] = useState(false)
  const [load, setLoad] = useState(false)

  useEffect(() => {
    if (activeShop?._id) {
      setLoad(true)
      handleGetMotif()
    }
  }, [activeShop, page, forceReload])

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleGetMotif = () => {
    let query = `page=${page + 1}`
    getMotifs(query)
      .then(response => {
        setMotifs(response.data.data)
        setCount(response.data.total)
      })
      .finally(() => setLoad(false))
  }

  const handleDeleteMotif = (motif: any) => {
    if (motif?._id) {
      swal({
        title: '',
        text: t('delete_text') + '',
        icon: 'error',
        buttons: [t('cancel') + '', t('delete') + ''],
        dangerMode: true
      }).then(willDelete => {
        if (willDelete) {
          deleteMotif(motif?._id).then(response => {
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
        <Typography variant='h4'>{t('reason_title')}</Typography>
      </Grid>
      <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          startIcon={<Add />}
          onClick={() => router.push('motifs/create/')}
          size='large'
          variant='contained'
          sx={{ textTransform: 'initial' }}
        >
          {t('add_reason')}
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Card className={'responsiveTable-' + settings?.mode}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }} className={'responsiveTable-' + settings?.mode}>
            <TableContainer sx={{}}>
              <Table stickyHeader aria-label='sticky table'>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('reason')}</TableCell>
                    <TableCell align='center'>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {load ? (
                    <TableRow>
                      <TableCell colSpan={2} align='center'>
                        {' '}
                        <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                          <CircularProgress size={40} color='inherit' />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    motifs?.map((motif: any) => (
                      <TableRow hover key={motif?._id}>
                        <TableCell>{motif?.title}</TableCell>
                        <TableCell align='center'>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                            <IconButton
                              onClick={() => router.push(`motifs/create?id=${motif?._id}`)}
                              aria-label='update'
                            >
                              <Edit />
                            </IconButton>
                            <IconButton aria-label='delete' onClick={() => handleDeleteMotif(motif)}>
                              <Delete sx={{ color: 'red' }} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 15, 20, 25, 50]}
              component='div'
              rowsPerPage={8}
              count={count}
              page={1}
              onPageChange={handleChangePage}
              labelRowsPerPage='Pages'
            />
          </Paper>
        </Card>
      </Grid>
    </Grid>
  )
}

export default MotifList
