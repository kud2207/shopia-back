// ** React Imports
import { useState, SyntheticEvent, Fragment, ReactNode } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import { styled, Theme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import MuiMenu, { MenuProps } from '@mui/material/Menu'
import MuiAvatar, { AvatarProps } from '@mui/material/Avatar'
import MuiMenuItem, { MenuItemProps } from '@mui/material/MenuItem'
import Typography, { TypographyProps } from '@mui/material/Typography'
import Backdrop from '@mui/material/Backdrop'
import Modal from '@mui/material/Modal'
import Fade from '@mui/material/Fade'
import CreateShop from 'src/pages/shop/create'

// ** Third Party Components
import PerfectScrollbarComponent from 'react-perfect-scrollbar'
import Icon from '@mdi/react'
import { mdiStorePlus, mdiCheckAll } from '@mdi/js'
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { List, ListItemButton } from '@mui/material'
import { toast } from 'react-toastify'

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

// ** Styled MenuItem component
const MenuItem = styled(MuiMenuItem)<MenuItemProps>(({ theme }) => ({
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  borderBottom: `1px solid ${theme.palette.divider}`
}))

const styles = {
  maxHeight: 349,
  '& .MuiMenuItem-root:last-of-type': {
    border: 0
  }
}

// ** Styled PerfectScrollbar component
const PerfectScrollbar = styled(PerfectScrollbarComponent)({
  ...styles
})

// ** Styled Avatar component
const Avatar = styled(MuiAvatar)<AvatarProps>({
  width: '2.375rem',
  height: '2.375rem',
  fontSize: '1.125rem'
})

// ** Styled component for the title in MenuItems
const MenuItemTitle = styled(Typography)<TypographyProps>(({ theme }) => ({
  fontWeight: 600,
  flex: '1 1 100%',
  overflow: 'hidden',
  fontSize: '0.875rem',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  marginBottom: theme.spacing(0.75)
}))

// ** Styled component for the subtitle in MenuItems
const MenuItemSubtitle = styled(Typography)<TypographyProps>({
  flex: '1 1 100%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis'
})

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '28rem',
  bgcolor: 'background.paper',
  boxShadow: 24
}

const ShopDropdown = () => {
  // ** States
  const [anchorEl, setAnchorEl] = useState<(EventTarget & Element) | null>(null)
  const [openShopForm, setOpenShopForm] = useState(false)

  const handleCloseShopForm = () => setOpenShopForm(false)
  const { t } = useTranslation('common')
  const { shops, activeShop, setActiveShop, user } = useGlobalContext()!

  // ** Hook
  const hidden = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))

  const handleDropdownOpen = (event: SyntheticEvent) => {
    setAnchorEl(event.currentTarget)
  }

  const handleDropdownClose = () => {
    setAnchorEl(null)
  }

  const handleChangeShop = (shop: any) => {
    if (shop) {
      setActiveShop(shop)
      localStorage.setItem('activeShop', shop._id)
    }
    handleDropdownClose()
  }

  const ScrollWrapper = ({ children }: { children: ReactNode }) => {
    if (hidden) {
      return <Box sx={{ ...styles, overflowY: 'auto', overflowX: 'hidden' }}>{children}</Box>
    } else {
      return (
        <PerfectScrollbar options={{ wheelPropagation: false, suppressScrollX: true }}>{children}</PerfectScrollbar>
      )
    }
  }
  const handleOpenShopForm = () => {
    if (shops.length < user?.plan?.shops) {
      handleDropdownClose()
      setOpenShopForm(true)
    }else {
      toast.error(t("upgrade_plan"))
    }
  }

  return (
    <Fragment>
      {!activeShop || !activeShop?.logo ? (
        <IconButton
          sx={{ color: 'white', backgroundColor: 'primary.main' }}
          color='inherit'
          aria-haspopup='false'
          onClick={handleDropdownOpen}
          aria-controls='customized-menu'
        >
          <Icon path={mdiStorePlus} size={1} />
        </IconButton>
      ) : (
        <List component='nav' aria-label='Device settings'>
          <ListItemButton
            id='lock-button'
            aria-haspopup='listbox'
            aria-controls='lock-menu'
            aria-label='when device is locked'
            onClick={handleDropdownOpen}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              {activeShop?.logo ? <Avatar alt={activeShop?.name} src={activeShop?.logo} className='b-circle' /> : <></>}
              {activeShop != null && (
                <Box
                  className='d-sm-none'
                  sx={{ mx: 4, flex: '1 1', display: 'flex', overflow: 'hidden', flexDirection: 'column' }}
                >
                  <MenuItemTitle>{activeShop.name}</MenuItemTitle>
                </Box>
              )}
            </Box>
          </ListItemButton>
        </List>
      )}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleDropdownClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem disableRipple>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Typography sx={{ fontWeight: 600 }}>{t('my_shops')}</Typography>
          </Box>
        </MenuItem>
        <ScrollWrapper>
          {shops?.map((shop: any) => (
            <MenuItem onClick={() => handleChangeShop(shop)} key={shop._id} selected={activeShop?._id == shop._id}>
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                <Avatar alt={shop.name} src={shop.logo} />
                <Box sx={{ mx: 4, flex: '1 1', display: 'flex', overflow: 'hidden', flexDirection: 'column' }}>
                  <MenuItemTitle>{shop.name}</MenuItemTitle>
                  <MenuItemSubtitle variant='body2'>{shop.description}</MenuItemSubtitle>
                </Box>
                {activeShop?._id == shop._id && (
                  <Typography variant='caption' sx={{ color: 'text.primary' }}>
                    <Icon path={mdiCheckAll} size={1} />
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </ScrollWrapper>
        <MenuItem
          disableRipple
          sx={{ py: 3.5, borderBottom: 0, borderTop: (theme: any) => `1px solid ${theme.palette.divider}` }}
        >
          <Button fullWidth variant='contained' onClick={handleOpenShopForm}>
            {t('create_shop')}
          </Button>
        </MenuItem>
      </Menu>
      <Modal
        aria-labelledby='transition-modal-title'
        aria-describedby='transition-modal-description'
        open={openShopForm}
        onClose={handleCloseShopForm}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500
          }
        }}
      >
        <Fade in={openShopForm}>
          <Box sx={style}>
            <CreateShop isAuthenticate={true} handleActionCompleted={handleCloseShopForm} />
          </Box>
        </Fade>
      </Modal>
    </Fragment>
  )
}

export default ShopDropdown
