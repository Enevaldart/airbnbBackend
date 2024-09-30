require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const User = require('./models/user'); // Import the User model

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
    
    // Create the first admin user
    createFirstAdmin();
  })
  .catch(err => console.log(err));

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Airbnb-like Backend API');
});

// Routes
const homeRoutes = require('./routes/homeRoutes');
app.use('/api/homes', homeRoutes);

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const ownerStatsRoutes = require('./routes/ownerStatsRoutes');
app.use('/api/home-owner-stats', ownerStatsRoutes);

const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/booking', bookingRoutes);

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Function to create the first admin
async function createFirstAdmin() {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const admin = new User({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin',
      });
      await admin.save();
      console.log('First admin user created');
    } else {
      console.log('Admin user already exists');
    }
  } catch (err) {
    console.error('Error creating the first admin:', err);
  }
}

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
