const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());  // To parse JSON request bodies

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/airbnb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Basic Route
app.get('/', (req, res) => {
  res.send('Hello, Airbnb Backend!');
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
