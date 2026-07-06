// ** React Imports
import { useState, SyntheticEvent, Fragment } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Menu from '@mui/material/Menu'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Icon from '@mdi/react'
import { mdiTranslate } from '@mdi/js'
import { useTranslation } from 'react-i18next'

// ** Type Import
import { Settings } from 'src/@core/context/settingsContext'

interface Props {
  settings: Settings
  saveSettings: (values: Settings) => void
}

const LanguageDropdown = (props: Props) => {
  // ** States
  const [anchorEl, setAnchorEl] = useState<Element | null>(null)
  const { settings, saveSettings } = props

  //language
  const { i18n } = useTranslation()

  // ** Hooks
  const router = useRouter()

  const handleDropdownOpen = (event: SyntheticEvent) => {
    setAnchorEl(event.currentTarget)
  }

  const handleDropdownClose = (url?: string) => {
    if (url) {
      router.push(url)
    }
    setAnchorEl(null)
  }

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    const { pathname, asPath, query } = router;
    router.push({ pathname, query }, asPath, { locale: language });
    saveSettings({ ...settings, language })
    handleDropdownClose()
  }

  const styles = {
    py: 2,
    px: 4,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    color: 'text.primary',
    textDecoration: 'none',
    '& svg': {
      fontSize: '1.375rem',
      color: 'text.secondary'
    }
  }

  return (
    <Fragment>
      <IconButton color='inherit' aria-haspopup='true' onClick={handleDropdownOpen} aria-controls='customized-menu'>
        <Icon path={mdiTranslate} size={1} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => handleDropdownClose()}
        sx={{ '& .MuiMenu-paper': { width: 100, marginTop: 4 } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem sx={{ p: 0 }} selected={i18n.language == 'fr'} onClick={() => handleLanguageChange('fr')}>
          <Box sx={styles}>Français</Box>
        </MenuItem>
        <MenuItem sx={{ p: 0 }} selected={i18n.language == 'en'} onClick={() => handleLanguageChange('en')}>
          <Box sx={styles}>English</Box>
        </MenuItem>
      </Menu>
    </Fragment>
  )
}

export default LanguageDropdown
