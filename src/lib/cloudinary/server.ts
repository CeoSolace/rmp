import { v2 as cloudinary } from 'cloudinary';

// Configure the Cloudinary client. Only server-side code should import
// this file, as the API secret must never be exposed to the client.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;