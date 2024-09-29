const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Home = require("../models/home");
const User = require('../models/user');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid"); // For unique filenames
const { authenticateToken } = require("../middleware/authenticateToken");

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./uploads/homes";
    // Create directory if it doesn't exist
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Add unique identifier (UUID) for filenames to prevent name conflicts
    const uniqueSuffix = uuidv4() + '-' + Date.now();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limit files to 5MB
  },
  fileFilter: function (req, file, cb) {
    // Allow only image files with specific extensions
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
    if (!mongoose.Types.ObjectId.isValid(req.params.ownerId)) {
      return res.status(400).json({ message: "Invalid owner ID" });
    }

    const homes = await Home.find({ owner: req.params.ownerId });

    if (homes.length === 0) {
      return res.status(404).json({ message: "No homes found for this owner" });
    }

    res.json(homes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new home (by an authenticated user)
router.post("/", authenticateToken, upload.array('images', 30), async (req, res) => {
  const { name, description, location, price, amenities, bedrooms, beds } = req.body;

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
    bedrooms,
    beds,
    reviews: [],
    owner: req.user.id,
  });

  try {
    const savedHome = await home.save();
    res.status(201).json(savedHome);
  } catch (err) {
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

    const query = {};

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }
    if (minPrice) {
      query.price = { ...query.price, $gte: Number(minPrice) };
    }
    if (maxPrice) {
      query.price = { ...query.price, $lte: Number(maxPrice) };
    }
    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    const homes = await Home.find(query);
    res.json(homes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all homes owned by the logged-in user
router.get("/myhomes", authenticateToken, async (req, res) => {
  try {
    const userHomes = await Home.find({ owner: req.user.id });

    if (userHomes.length === 0) {
      return res.status(200).json({ message: "No homes found for this user", homes: [] });
    }

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
router.put("/:id", authenticateToken, upload.array('images', 30), async (req, res) => {
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

    home.name = name || home.name;
    home.description = description || home.description;
    home.location = location || home.location;
    home.price = price || home.price;
    home.amenities = amenities ? JSON.parse(amenities) : home.amenities;

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

    home.imageUrl.forEach(url => {
      fs.unlink(`.${url}`, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    });

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

    // Find the home by ID and populate the user field in reviews with the username
    const home = await Home.findById(req.params.id)
      .populate('reviews.user', 'username'); // Only populate the 'username' field

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
