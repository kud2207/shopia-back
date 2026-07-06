import { Box, Fade, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import DotsVertical from 'mdi-material-ui/DotsVertical'
import moment from 'moment'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { updateNotification } from 'src/@apiCore/npoints'
import { useGlobalContext } from 'src/@core/context/globalContext'

export const NotificationItem = ({ title, content, idNotif, userId, read, createdAt, href, redirectionLabel }: any) => {
  const { t } = useTranslation('common')
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const router = useRouter()
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const { notifications, setNotifications } = useGlobalContext()
  const handleMarkAsRead = () => {
    setNotifications(notifications.map(item => (item._id == idNotif ? { ...item, read: true } : item)))
    idNotif && updateNotification({ idNotif: idNotif, data: { read: true, userId } })

    setAnchorEl(null)
  }
  const handleMarkAsUnRead = () => {
    setNotifications(notifications.map(item => (item._id == idNotif ? { ...item, read: false } : item)))

    idNotif && updateNotification({ idNotif: idNotif, data: { read: false, userId } })

    setAnchorEl(null)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleDetail = () => {
    if (!read) handleMarkAsRead()
    if (href) router.push(href)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 6, cursor: 'pointer' }}>
      <Box sx={{ minWidth: 38, display: 'flex', justifyContent: 'center' }} onClick={handleDetail}>
        <img src={'/images/avatars/1.png'} alt={''} style={{ borderRadius: 50 }} width={45} height={45} />
      </Box>
      <Box
        sx={{
          ml: 4,
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ marginRight: 2, display: 'flex', flexDirection: 'column' }} onClick={handleDetail}>
          <Box display={'flex'} flexDirection={'row'} alignItems={'center'}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }} variant='caption'>
              {title}
            </Typography>
            {!read && (
              <Box
                height={8}
                width={8}
                border={'1px solid #56CA00'}
                sx={{ backgroundColor: '#56CA00', marginLeft: 3 }}
                borderRadius={50}
              ></Box>
            )}
          </Box>
          <Box display={'flex'} flexDirection={'row'} alignItems={'center'}>
            <Typography variant='caption' className='single-line'>
              {content}
            </Typography>
          </Box>
          <Box fontSize={12}>{moment(createdAt).fromNow()}</Box>
        </Box>
        <IconButton onClick={handleClick} edge='end' aria-label='comments'>
          <DotsVertical />
        </IconButton>
        <Menu
          id='fade-menu'
          MenuListProps={{
            'aria-labelledby': 'fade-button'
          }}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          TransitionComponent={Fade}
        >
          {!read && <MenuItem onClick={handleMarkAsRead}>{t('mark_read')}</MenuItem>}
          {read && <MenuItem onClick={handleMarkAsUnRead}>{t('mark_unread')}</MenuItem>}
          <Link href={href} onClick={handleMarkAsRead}>
            <MenuItem onClick={() => setAnchorEl(null)}>{redirectionLabel ?? 'Details'}</MenuItem>
          </Link>
        </Menu>
      </Box>
    </Box>
  )
}
