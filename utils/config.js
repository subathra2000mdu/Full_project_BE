require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/job-portal';
const PORT = process.env.PORT || 5001;

module.exports = {
    MONGODB_URI,
    PORT
}