const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('\n💡 Tip: Ensure MongoDB is installed and running locally.');
    console.log('   Check your .env file for the correct MONGODB_URI.');
    console.log('   If using MongoDB Atlas, make sure your IP is allowlisted.\n');
    process.exit(1);
  }
};

module.exports = connectDB;
