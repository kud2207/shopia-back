import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import InputAdornment from '@mui/material/InputAdornment'
import Magnify from 'mdi-material-ui/Magnify'
import MenuItem from '@mui/material/MenuItem'
import { useRouter } from 'next/router'
import { Object } from 'src/types'

interface Props {
  objectName: string
  placeholder: any
  data: any[]
  handleClik?: (id: string) => void
  search: string
  setSearch: (id: string) => void
}

const InputSearch = (props: Props) => {
  const { objectName, data, placeholder, search, setSearch } = props
  const router = useRouter()

  const handleShowDetail = (id: string) => {
    switch (objectName) {
      case Object.Order:
        router.push('/app/orders/' + id)
        break

      case Object.Product:
        router.push('/app/products/create?id=' + id)
        break

      case Object.Client:
        break

      default:
        break
    }
  }

  return (
    <Autocomplete
      freeSolo
      id='free-solo-2-demo'
      disableClearable
      autoHighlight
      options={data}
      renderOption={(props, option) => (
        <MenuItem onClick={() => handleShowDetail(option._id)}>
          {option?.name ? option?.name : '#' + option?.order_id}
        </MenuItem>
      )}
      renderInput={params => (
        <TextField
          type='search'
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
          {...params}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position='start'>
                <Magnify fontSize='small' />
              </InputAdornment>
            )
          }}
          placeholder={placeholder}
          onChange={e => (e.target.value.length > 2 || !e.target.value ? setSearch(e.target.value) : {})}
          value={search}
        />
      )}
    />
  )
}

export default InputSearch
