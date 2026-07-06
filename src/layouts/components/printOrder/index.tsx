import React from 'react'
import { formatNumber } from 'src/@core/utils/format-currency'
import moment from 'moment'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
const RenderOrderPrint = (props: any) => {
  const styles: any = StyleSheet.create({
    page: {
      backgroundColor: '#fff'
    },
    section: {
      margin: 10,
      padding: 10
    },
    section1: {
      padding: 10,
      flex: 1
    },
    section2: {
      margin: 2,
      flex: 1
    },
    title: {
      fontSize: 14,
      fontWeight: 'bold',
      textDecoration: 'underline'
    },
    title2: {
      fontSize: 9,
      color: '#00000090',
      marginTop: 4
    },
    title1: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#00000098'
    },
    th: {
      fontSize: 9,
      fontWeight: 'bold',
      textAlign: 'center'
    },
    td: {
      fontSize: 9,
      color: '#00000098',
      textAlign: 'center'
    },
    flexRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: '30px'
    },
    flexRow1: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 10
    },
    flexRow2: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 5,
      alignItems: 'center'
    },
    mb5: {
      marginBottom: 8
    },
    text: {
      fontSize: '12px',
      color: '#00000098',
      lineHeight: '1.5px',
      fontWeight: 'light'
    },
    mt2: {
      marginTop: '10px'
    },
    head: {
      flexDirection: 'row'
    },
    p10: {
      padding: 10
    }
  })
  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.section}>
          <div>
            <Text
              style={{
                textAlign: 'center',
                fontSize: '18px',
                textTransform: 'uppercase'
              }}
            >
              {props.translate('info_facturation')} {'#' + props.orderData?.order_id}
            </Text>
          </div>
          <View style={styles.flexRow}>
            <View style={styles.section1}>
              <Image
                style={{ marginBottom: 10, width: '100px', height: '100px', borderRadius: 10, objectFit: 'cover' }}
                src={props.orderData?.shop?.logo}
              />
              <Text>{props.orderData?.shop?.name}</Text>
              <Text style={styles.text}>
                {props.orderData?.shop?.address}, {props.orderData?.shop?.city?.name}
                {props.orderData?.shop?.country ? ', ' + props.orderData?.shop?.country[props.lang || 'fr'] : ''}
              </Text>
              <Text style={styles.text}>{props.orderData?.shop?.phone}</Text>
            </View>
            <View>
              <View style={styles.section1}>
                <Text style={[styles.mb5, styles.text]}>Date: {moment(props.orderData?.date).format('LLL')}</Text>
                <View>
                  <Text>{props.translate('invoice_to')} :</Text>
                </View>
                <Text style={[styles.mt2, styles.text]}>{props.orderData?.customer?.name}</Text>
                {props.orderData?.deliveryInfo?.address && props.orderData?.deliveryInfo?.city && (
                  <Text style={styles.text}>
                    {props.orderData?.deliveryInfo?.address + ', ' + props.orderData?.deliveryInfo?.city}
                  </Text>
                )}
                <Text style={styles.text}>{props.orderData?.customer?.phone}</Text>
                {props.orderData?.customer?.email && <Text style={styles.text}>{props.orderData?.customer?.email}</Text>}
              </View>
            </View>
          </View>

          <div style={{ background: '#75757560', width: '100%', height: '5px' }} />
          <table style={{ borderWidth: 0.6, borderColor: '#000', width: '100%' }}>
            <thead>
              <tr style={{ flexDirection: 'row', borderTopWidth: 0.6, borderTopColor: '#000' }}>
                <th style={styles.section2}>
                  <Text style={styles.th}>{props.translate('Products')}</Text>
                </th>
                <th style={styles.section2}>
                  <Text style={styles.th}>{props.translate('Price')}</Text>
                </th>
                <th style={styles.section2}>
                  <Text style={styles.th}>{props.translate('Quantity')}</Text>
                </th>
                <th style={styles.section2}>
                  <Text style={styles.th}>{props.translate('Total')}</Text>
                </th>
              </tr>
            </thead>
            <tbody>
              {props.orderData?.items?.map((row, index) => (
                <tr style={{ flexDirection: 'row', borderTopWidth: 0.6, borderTopColor: '#000' }}>
                  <td style={styles.section2}>
                    <Text style={styles.td}>{row.product?.name}</Text>
                  </td>
                  <td style={styles.section2}>
                    <Text style={styles.td}>{formatNumber(row?.total / row.quantity)}</Text>
                  </td>
                  <td style={styles.section2}>
                    <Text style={styles.td}>{row.quantity}</Text>
                  </td>
                  <td style={styles.section2}>
                    <Text style={styles.td}> {formatNumber(row?.total)}</Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <View style={styles.flexRow1}>
            <View style={styles.p10}>
              <View>
                <Text style={styles.text}>{props.invoiceForm?.thanksgiving}</Text>
              </View>
            </View>
            <View style={{ minWidth: '40%' }}>
              <View style={styles.flexRow2}>
                <Text style={styles.text}>{props.translate('subtotal')}</Text>
                <Text style={styles.text}>
                  {props.orderData?.total} {props.activeShop?.currency || props.orderData?.shop?.currency}
                </Text>
              </View>
              <View style={styles.flexRow2}>
                <Text style={styles.text}>{props.translate('discount')}</Text>
                <Text style={styles.text}>00.00</Text>
              </View>
              <div style={{ background: '#75757560', width: '100%', height: '5px' }} />
              <View style={styles.flexRow2}>
                <Text style={styles.text}>{props.translate('Total')}</Text>
                <Text style={styles.text}>
                  {props.orderData?.total} {props.activeShop?.currency || props.orderData?.shop?.currency}
                </Text>
              </View>
            </View>
          </View>
          {props.invoiceForm?.note && (
            <>
              <div style={{ background: '#75757560', width: '100%', height: '5px' }} />

              <View style={styles.p10}>
                <Text>{props.translate('Note')}</Text>
                <br />
                <Text style={[styles.text, styles.mt2]}>{props.invoiceForm?.note}</Text>
              </View>
            </>
          )}
        </View>
      </Page>
    </Document>
  )
}

export default RenderOrderPrint
