import multer from 'multer';

// Define the storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'public/images/profile'); // Specify the upload directory
  },
  filename: (req, file, callback) => {
    callback(null, `${file.originalname}`); // Define the file name
  },
});

// Create the multer instance with the storage configuration
const upload = multer({ storage });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default upload.any(); // Middleware to handle a single file upload
