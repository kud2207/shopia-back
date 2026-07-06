// ** React Imports
import { SyntheticEvent, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import TabContext from '@mui/lab/TabContext'
import { styled } from '@mui/material/styles'
import MuiTab, { TabProps } from '@mui/material/Tab'


// ** Third Party Styles Imports
import 'react-datepicker/dist/react-datepicker.css'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'react-i18next'
import DeliveryTab from './DeliveryTab'
import DeliveryCompany from './DeliveryCompany'

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

const DeliverySettings = () => {
  const { t } = useTranslation('shop')

  // ** State
  const [value, setValue] = useState<string>('delivery')

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue)
  }

  return (
    <Card>
      <TabContext value={value}>
        <TabList
          onChange={handleChange}
          aria-label='account-settings tabs'
          sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }}
        >
          <Tab
            value='delivery'
            label={t('delivery_configs')}
          />
          <Tab
            value='delivery-company'
            label={t('delivery_company')}
          /> 
        </TabList>

        <TabPanel sx={{ p: 0 }} value='delivery'>
          <DeliveryTab />
        </TabPanel>
        <TabPanel sx={{ p: 0 }} value='delivery-company'>
          <DeliveryCompany />
        </TabPanel>
      </TabContext>
    </Card>
  )
}

export default DeliverySettings
