const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Home = require("../models/home");

// Get all homes
router.get("/", async (req, res) => {
  try {
    const homes = await Home.find();
    res.json(homes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new home
router.post("/", async (req, res) => {
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


// Search and filter homes
router.get('/search', async (req, res) => {
  try {
    const { location, minPrice, maxPrice, minRating } = req.query;

    // Build the query object
    const query = {};

    // Add filters based on query parameters
    if (location) {
      query.location = { $regex: location, $options: 'i' }; // Case-insensitive search
    }
    if (minPrice) {
      query.price = { ...query.price, $gte: Number(minPrice) }; // Greater than or equal to minPrice
    }
    if (maxPrice) {
      query.price = { ...query.price, $lte: Number(maxPrice) }; // Less than or equal to maxPrice
    }
    if (minRating) {
      query.rating = { $gte: Number(minRating) }; // Greater than or equal to minRating
    }

    // Find homes based on the query
    const homes = await Home.find(query);
    res.json(homes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// Get a single home by ID
router.get("/:id", async (req, res) => {
  try {
    const home = await Home.findById(req.params.id);
    if (!home) {
      return res.status(404).json({ message: "Home not found" });
    }
    res.json(home);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a home by ID
router.put("/:id", async (req, res) => {
  try {
    const { name, description, location, price, imageUrl, rating } = req.body;

    // Find the home by ID and update its details
    const updatedHome = await Home.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        location,
        price,
        imageUrl,
        rating,
      },
      { new: true } // Return the updated document
    );

    if (!updatedHome) {
      return res.status(404).json({ message: "Home not found" });
    }

    res.json(updatedHome);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a home by ID
router.delete("/:id", async (req, res) => {
  try {
    // Check if the provided ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid home ID" });
    }

    const home = await Home.findByIdAndDelete(req.params.id);

    // If the home is not found, return a 404 error
    if (!home) {
      return res.status(404).json({ message: "Home not found" });
    }

    // If the home is successfully deleted, return a success message
    res.json({ message: "Home deleted successfully" });
  } catch (err) {
    // If there's a server error, return a 500 error
    res.status(500).json({ message: err.message });
  }
});

// Add a review to a home by ID
router.post("/:id/review", async (req, res) => {
  const { user, comment, rating } = req.body;

  try {
    // Check if the provided ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid home ID" });
    }

    // Validate review data
    if (!user || !comment || rating == null) {
      return res
        .status(400)
        .json({ message: "All review fields are required" });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    // Find the home by ID
    const home = await Home.findById(req.params.id);
    if (!home) {
      return res.status(404).json({ message: "Home not found" });
    }

    // Add the new review
    home.reviews.push({ user, comment, rating });
    const updatedHome = await home.save();

    res.json(updatedHome);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all reviews for a specific home by ID
router.get("/:id/reviews", async (req, res) => {
  try {
    // Check if the provided ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid home ID" });
    }

    // Find the home by ID
    const home = await Home.findById(req.params.id);
    if (!home) {
      return res.status(404).json({ message: "Home not found" });
    }

    // Return the reviews for the home
    res.json(home.reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific review for a specific home by review ID
router.get("/:homeId/reviews/:reviewId", async (req, res) => {
  try {
    // Check if the provided home ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.homeId)) {
      return res.status(400).json({ message: "Invalid home ID" });
    }

    // Check if the provided review ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.reviewId)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    // Find the home by ID
    const home = await Home.findById(req.params.homeId);
    if (!home) {
      return res.status(404).json({ message: "Home not found" });
    }

    // Find the specific review by ID within the home's reviews
    const review = home.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Return the specific review
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
