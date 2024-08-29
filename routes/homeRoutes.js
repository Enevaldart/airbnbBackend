const express = require('express');
const router = express.Router();
const Home = require('../models/home');

// Get all homes
router.get('/', async (req, res) => {
  try {
    const homes = await Home.find();
    res.json(homes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new home
router.post('/', async (req, res) => {
  const { name, description, location, price, imageUrl, rating } = req.body;

  const home = new Home({
    name,
    description,
    location,
    price,
    imageUrl,
    rating,
    reviews: [],
  });

  try {
    const savedHome = await home.save();
    res.status(201).json(savedHome);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add a review to a home
router.post('/:id/review', async (req, res) => {
  const { user, comment, rating } = req.body;

  try {
    const home = await Home.findById(req.params.id);
    home.reviews.push({ user, comment, rating });
    const updatedHome = await home.save();
    res.json(updatedHome);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
