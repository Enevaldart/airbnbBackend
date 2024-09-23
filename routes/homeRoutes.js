const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Home = require("../models/home");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticateToken } = require("../middleware/authenticateToken");


// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./uploads/homes";
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Get all homes
router.get("/", async (req, res) => {
  try {
    const homes = await Home.find();
    res.json(homes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all homes owned by a specific user
router.get("/owner/:ownerId", async (req, res) => {
  try {
    // Validate the provided user ID
    if (!mongoose.Types.ObjectId.isValid(req.params.ownerId)) {
      return res.status(400).json({ message: "Invalid owner ID" });
    }

    // Find all homes that are owned by the specific user
    const homes = await Home.find({ owner: req.params.ownerId });

    // If no homes are found, return a 404 status
    if (homes.length === 0) {
      return res.status(404).json({ message: "No homes found for this owner" });
    }

    // Return the list of homes
    res.json(homes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new home (by an authenticated user)
router.post("/", authenticateToken, upload.array('images', 5), async (req, res) => {
  const { name, description, location, price, amenities } = req.body;

  // Validate the required fields
  if (!name || !description || !location || !price || !req.files || req.files.length === 0) {
    return res.status(400).json({
      message: "All fields are required, including at least one image.",
    });
  }

  const imageUrls = req.files.map(file => `/uploads/homes/${file.filename}`);

  const home = new Home({
    name,
    description,
    location,
    price,
    imageUrl: imageUrls,
    amenities: amenities ? JSON.parse(amenities) : [],
    rating: 0,
    reviews: [],
    owner: req.user.id,
  });

  try {
    const savedHome = await home.save();
    res.status(201).json(savedHome);
  } catch (err) {
    // If there's an error, we should delete the uploaded files
    imageUrls.forEach(url => {
      fs.unlink(`.${url}`, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    });
    res.status(400).json({ message: err.message });
  }
});


// Search and filter homes
router.get("/search", async (req, res) => {
  try {
    const { location, minPrice, maxPrice, minRating } = req.query;

    // Build the query object
    const query = {};

    // Add filters based on query parameters
    if (location) {
      query.location = { $regex: location, $options: "i" }; // Case-insensitive search
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

// Get all homes owned by the logged-in user
router.get("/myhomes", authenticateToken, async (req, res) => {
  try {
    // Find homes where the owner is the logged-in user
    const userHomes = await Home.find({ owner: req.user.id });

    // If no homes are found, return an empty array
    if (userHomes.length === 0) {
      return res
        .status(200)
        .json({ message: "No homes found for this user", homes: [] });
    }

    // Return the list of homes
    res.json(userHomes);
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

// Update a home by ID (only by the owner)
router.put("/:id", authenticateToken, upload.array('images', 5), async (req, res) => {
  const { name, description, location, price, amenities } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid home ID" });
    }

    const home = await Home.findById(req.params.id);

    if (!home) {
      return res.status(404).json({ message: "Home not found" });
    }

    if (home.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "You do not have permission to update this home" });
    }

    // Update the home details
    home.name = name || home.name;
    home.description = description || home.description;
    home.location = location || home.location;
    home.price = price || home.price;
    home.amenities = amenities ? JSON.parse(amenities) : home.amenities;

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImageUrls = req.files.map(file => `/uploads/homes/${file.filename}`);
      home.imageUrl = [...home.imageUrl, ...newImageUrls];
    }

    const updatedHome = await home.save();

    res.json(updatedHome);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a home by ID (only the owner or an admin can delete)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid home ID" });
    }

    const home = await Home.findById(req.params.id);
    if (!home) {
      return res.status(404).json({ message: "Home not found" });
    }

    if (home.owner.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "You are not authorized to delete this home" });
    }

    // Delete associated image files
    home.imageUrl.forEach(url => {
      fs.unlink(`.${url}`, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    });

    // Delete the home from the database
    await Home.findByIdAndDelete(req.params.id);
    res.json({ message: "Home deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//reviews

// Add a review to a home by ID
router.post("/:id/review", authenticateToken, async (req, res) => {
  const { comment, rating } = req.body;

  // Check if the user is authenticated
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Please log in to make reviews" });
  }

  // Validate review data
  if (!comment || rating == null) {
    return res.status(400).json({ message: "All review fields are required" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

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

    // Add the new review
    home.reviews.push({
      user: req.user.id, // Use the logged-in user's ID
      comment,
      rating,
    });

    // Calculate the new average rating
    const totalRating = home.reviews.reduce(
      (acc, review) => acc + review.rating,
      0
    );
    const averageRating = (totalRating / home.reviews.length).toFixed(1);

    // Update the home's rating
    home.rating = averageRating;

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

/// Delete a home by ID (only the owner or an admin can delete)
router.delete("/:id", authenticateToken, async (req, res) => {
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

    // Check if the user is the owner of the home or an admin
    if (home.owner.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this home" });
    }

    // Delete the home
    await home.remove();
    res.json({ message: "Home deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
