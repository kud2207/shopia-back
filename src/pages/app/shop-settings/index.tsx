// ** React Imports
import { SyntheticEvent, useState } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import TabContext from '@mui/lab/TabContext'
import { styled } from '@mui/material/styles'
import MuiTab, { TabProps } from '@mui/material/Tab'

// ** Icons Imports
import StoreCogOutline from 'mdi-material-ui/StoreCogOutline'
import TruckDeliveryOutline from 'mdi-material-ui/TruckDeliveryOutline'
import BookOpenOutline from 'mdi-material-ui/BookOpenOutline'
import MessageTextOutline from 'mdi-material-ui/MessageTextOutline'

// ** Third Party Styles Imports
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'react-i18next'
import TabGeneral from 'src/views/shop-settings/TabGeneral'
import TabBot from 'src/views/shop-settings/TabBot'
import { TabBill } from 'src/views/shop-settings/TabBill'
import DeliverySettings from 'src/views/shop-settings/DeliverySettings'
import { Grid } from '@mui/material'
import { Bullhorn } from 'mdi-material-ui'
import TabAd from 'src/views/shop-settings/TabAd'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common', 'account', 'shop']))
    }
  }
}

const Tab = styled(MuiTab)<TabProps>(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    minWidth: 100
  },
  [theme.breakpoints.down('sm')]: {
    minWidth: 67
  }
}))

const TabName = styled('span')(({ theme }) => ({
  lineHeight: 1.71,
  fontSize: '0.875rem',
  marginLeft: theme.spacing(2.4),
  [theme.breakpoints.down('md')]: {
    display: 'none'
  }
}))

const ShopSettings = () => {
  const { t } = useTranslation('shop')

  // ** State
  const [value, setValue] = useState<string>('info')

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue)
  }

  return (
    <Grid item xs={12}>
      <Card>
        <TabContext value={value}>
          <TabList
            onChange={handleChange}
            aria-label='account-settings tabs'
            sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }}
          >
            <Tab
              value='info'
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <StoreCogOutline />
                  <TabName>{t('info')}</TabName>
                </Box>
              }
            />
            <Tab
              value='bot'
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MessageTextOutline />
                  <TabName>{t('bot')}</TabName>
                </Box>
              }
            />
             <Tab
              value='ad'
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Bullhorn />
                  <TabName>{t('pub')}</TabName>
                </Box>
              }
            />
            <Tab
              value='delivery'
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TruckDeliveryOutline />
                  <TabName>{t('delivery')}</TabName>
                </Box>
              }
            />
            <Tab
              value='bill'
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BookOpenOutline />
                  <TabName>{t('Invoice')}</TabName>
                </Box>
              }
            />
          </TabList>

          <TabPanel sx={{ p: 0 }} value='info'>
            <TabGeneral />
          </TabPanel>
          <TabPanel sx={{ p: 0 }} value='bot'>
            <TabBot />
          </TabPanel>
          <TabPanel sx={{ p: 0 }} value='delivery'>
            <DeliverySettings />
          </TabPanel>
          <TabPanel sx={{ p: 0 }} value='bill'>
            <TabBill />
          </TabPanel>
          <TabPanel sx={{ p: 0 }} value='ad'>
            <TabAd />
          </TabPanel>
        </TabContext>
      </Card>
    </Grid>
  )
}

export default ShopSettings
