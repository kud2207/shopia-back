// ** React Imports
import React, { useState, SyntheticEvent, Fragment } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import MuiMenu, { MenuProps } from '@mui/material/Menu'
import Typography from '@mui/material/Typography'

// ** Icons Imports
import BellOutline from 'mdi-material-ui/BellOutline'

// ** Third Party Components
import { Badge, Tab, Tabs } from '@mui/material'
import { NotificationItem } from 'src/@core/components/notificationItem'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { useTranslation } from 'react-i18next'

// ** Styled Menu component
const Menu = styled(MuiMenu)<MenuProps>(({ theme }) => ({
  '& .MuiMenu-paper': {
    width: 380,
    overflow: 'hidden',
    marginTop: theme.spacing(4),
    [theme.breakpoints.down('sm')]: {
      width: '100%'
    }
  },
  '& .MuiMenu-list': {
    padding: 0
  }
}))

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
      style={{ maxHeight: 400, overflowY: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  }
}

const NotificationDropdown = () => {
  const { t } = useTranslation('common')

  // ** States
  const [anchorEl, setAnchorEl] = useState<(EventTarget & Element) | null>(null)
  const { notifications, user } = useGlobalContext()!
  const [value, setValue] = React.useState(0)
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }
  const handleDropdownOpen = (event: SyntheticEvent) => {
    setAnchorEl(event.currentTarget)
  }

  const handleDropdownClose = () => {
    setAnchorEl(null)
  }

  const processDisplayBadge = () => {
    const result = notifications.filter((n: any) => !n?.read)

    return result.length
  }

  return (
    <Fragment>
      <IconButton color='inherit' aria-haspopup='true' onClick={handleDropdownOpen} aria-controls='customized-menu'>
        <Badge badgeContent={processDisplayBadge() > 9 ? '9+' : processDisplayBadge()} color='primary'>
          <BellOutline />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleDropdownClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={value} onChange={handleChange} aria-label='basic tabs example'>
              <Tab label={t('all')} {...a11yProps(0)} />
              <Tab label={t('nonlues')} {...a11yProps(1)} />
            </Tabs>
          </Box>
          <CustomTabPanel value={value} index={0}>
            {notifications?.map((n: any, i: any) => (
              <NotificationItem
                key={i}
                createdAt={n?.createdAt}
                href={n?.redirectionLink}
                read={n?.read}
                tabValue={value}
                idNotif={n?._id}
                userId={user?._id}
                title={n?.title}
                content={n?.content}
              />
            ))}
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            {notifications?.map(
              (n: any, i: any) =>
                !n.read && (
                  <NotificationItem
                    redirectionLabel={n?.redirectionLabel}
                    key={i}
                    createdAt={n?.createdAt}
                    read={n?.read}
                    href={n?.redirectionLink}
                    tabValue={value}
                    idNotif={n?._id}
                    userId={user?._id}
                    title={n?.title}
                    content={n?.content}
                  />
                )
            )}
          </CustomTabPanel>
        </Box>
      </Menu>
    </Fragment>
  )
}

export default NotificationDropdown
