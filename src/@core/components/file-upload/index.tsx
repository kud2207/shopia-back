// MUI Imports
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import { styled } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import type { TypographyProps } from '@mui/material/Typography'

// Third-party Imports
import { toast } from 'react-toastify'

// Icon Imports
import { useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import { Close } from 'mdi-material-ui'

type FileProp = {
  name: string
  type: string
  size: number
}

// Styled component for the upload image inside the dropzone area
const Img = styled('img')(({ theme }) => ({
  [theme.breakpoints.up('md')]: {
    marginRight: theme.spacing(15.75)
  },
  [theme.breakpoints.down('md')]: {
    marginBottom: theme.spacing(4)
  },
  [theme.breakpoints.down('sm')]: {
    width: 160
  }
}))

// Styled component for the heading inside the dropzone area
const HeadingTypography = styled(Typography)<TypographyProps>(({ theme }) => ({
  marginBottom: theme.spacing(5),
  [theme.breakpoints.down('sm')]: {
    marginBottom: theme.spacing(4)
  }
}))

const FileUploader = ({ files, setFiles, images, setImages }: any) => {
  // States
  const { t } = useTranslation('common')

  // Hooks
  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: 5,
    maxSize: 2000000,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    onDrop: (acceptedFiles: File[]) => {
      const uniqueFiles = new Set(files.map((file: File) => file.name))

      // Filtrer les fichiers acceptés pour ne conserver que ceux qui ne sont pas déjà présents
      const newFiles = acceptedFiles.filter(file => !uniqueFiles.has(file.name))

      const data = files.concat(newFiles.map((file: File) => Object.assign(file)))

      if (data.length <= 5 && images.length <= 5) setFiles(data)
      else
        toast.error(t('max_file_error'), {
          autoClose: 3000
        })
    },
    onDropRejected: () => {
      toast.error(t('max_file_error'), {
        autoClose: 3000
      })
    }
  })

  const renderFilePreview = (file: FileProp) => {
    if (file.type.startsWith('image')) {
      return <img width={38} height={38} alt={file.name} src={URL.createObjectURL(file as any)} />
    } else {
      return <i className='ri-file-text-line' />
    }
  }

  const handleRemoveFile = (file: FileProp) => {
    const uploadedFiles = files
    const filtered = uploadedFiles.filter((i: FileProp) => i.name !== file.name)

    setFiles([...filtered])
  }

  const handleRemoveImage = (url: string) => {
    const uploadedFiles = images
    const filtered = uploadedFiles.filter((i: string) => i !== url)

    setImages([...filtered])
  }
  const fileList = files.map((file: FileProp) => (
    <ListItem key={file.name}>
      <div className='file-details'>
        <div className='file-preview'>{renderFilePreview(file)}</div>
        <div>
          <Typography className='file-name'>{file.name}</Typography>
          <Typography className='file-size' variant='body2'>
            {Math.round(file.size / 100) / 10 > 1000
              ? `${(Math.round(file.size / 100) / 10000).toFixed(1)} mb`
              : `${(Math.round(file.size / 100) / 10).toFixed(1)} kb`}
          </Typography>
        </div>
      </div>
      <IconButton onClick={() => handleRemoveFile(file)}>
        <Close />
      </IconButton>
    </ListItem>
  ))

  const imageList = images.map((url: string) => (
    <ListItem key={url}>
      <div className='file-details'>
        <div className='file-preview'>
          <img width={38} height={38} alt={''} src={url} />
        </div>
      </div>
      <IconButton onClick={() => handleRemoveImage(url)}>
        <Close />
      </IconButton>
    </ListItem>
  ))

  return (
    <>
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <div className='flex items-center flex-col md:flex-row'>
          <Img alt='Upload img' src='/images/misc/file-upload.png' className='max-bs-[160px] max-is-full bs-full' />
          <div className='flex flex-col md:[text-align:unset] text-center'>
            <HeadingTypography variant='body1'>{t('drop_file')}</HeadingTypography>
            <Typography variant='body2'>{t('accepted_file')} *.jpeg, *.jpg, *.png, *.gif</Typography>
            <Typography variant='body2'>{t('max_file')}</Typography>
          </div>
        </div>
      </div>
      {images.length ? (
        <>
          <List className='dropzone-preview'>{imageList}</List>
        </>
      ) : null}
      {files.length ? (
        <>
          <List className='dropzone-preview'>{fileList}</List>
        </>
      ) : null}
    </>
  )
}

export default FileUploader
