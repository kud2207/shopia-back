import RenderOrderPrint from '..'
import { Button } from '@mui/material'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { PDFDownloadLink } from '@react-pdf/renderer'
import Download from 'mdi-material-ui/Download'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['shop']))
    }
  }
}

const OrderPDF = ({ orderData, invoiceForm }) => {
  const { t, i18n } = useTranslation('order')
  const { activeShop } = useGlobalContext()

  return (
    <div>
      <PDFDownloadLink
        document={
          <RenderOrderPrint
            translate={t}
            lang={i18n.language}
            activeShop={activeShop}
            orderData={orderData}
            invoiceForm={invoiceForm}
          />
        }
        fileName={t('info_facturation') + '-' + orderData?.order_id + '.pdf'}
        style={{ color: '#fff' }}
      >
        <Button variant='contained' color='secondary' sx={{ margin: 4 }}>
         <Download /> {t('print')}
        </Button>
      </PDFDownloadLink>
    </div>
  )
}

export default OrderPDF
