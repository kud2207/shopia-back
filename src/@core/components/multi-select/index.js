import * as React from 'react'
import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import OutlinedInput from '@mui/material/OutlinedInput'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Chip from '@mui/material/Chip'
import { useTranslation } from 'react-i18next'

const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250
    }
  }
}

function getStyles(name, values, theme) {
  return {
    fontWeight: values.indexOf(name) === -1 ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium
  }
}

export default function MultipleSelectChip({ values, setValues, list, isCity, name='category', required=false }) {
  const theme = useTheme()
  const { t, i18n } = useTranslation('shop')
  const handleChange = event => {
    const {
      target: { value }
    } = event
    

    setValues(typeof value === 'string' ? value.split(',') : value)
  }

  return (
    <>
      <InputLabel id='demo-multiple-chip-label'>{t(name)}</InputLabel>
      <Select
        labelId='demo-multiple-chip-label'
        id='demo-multiple-chip'
        name={name}
        multiple
        value={list.filter((item)=>values?.map(val=>val?._id).includes(item._id))}
        onChange={handleChange}
        input={<OutlinedInput id='select-multiple-chip' label={t(name)} />}
        required={required}
        renderValue={selected => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
            {selected.map(value => (
              <Chip
                key={value}
                label={isCity ? value.name || value?.title : value[i18n.language] || value.en || value?.title}
                size='small'
                sx={{m:.2}}
              />
            ))}
          </Box>
        )}
        MenuProps={MenuProps}
      >
        {list.map(item => (
          <MenuItem key={item._id} value={item} style={getStyles(item, values, theme)}>
            {isCity ? item.name || item?.title : item[i18n.language] || item.en || item?.title}
          </MenuItem>
        ))}
      </Select>
    </>
  )
}