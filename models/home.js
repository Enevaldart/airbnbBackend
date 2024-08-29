const mongoose = require('mongoose');

const HomeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  rating: { type: Number, required: true },
  reviews: [{ 
    user: { type: String, required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true },
  }],
});

const Home = mongoose.model('Home', HomeSchema);

module.exports = Home;
