const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Home = require("../models/home");
const User = require("../models/user");
const { authenticateToken } = require("../middleware/authenticateToken");

// Get owner stats
router.get("/owner-stats/:ownerId", authenticateToken, async (req, res) => {
  try {
    const ownerId = req.params.ownerId;

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return res.status(400).json({ message: "Invalid owner ID" });
    }

    const ownerStats = await Home.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(ownerId) } },
      {
        $group: {
          _id: "$owner",
          totalHomes: { $sum: 1 },
          totalReviews: { $sum: { $size: "$reviews" } },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    if (ownerStats.length === 0) {
      return res.status(404).json({ message: "No homes found for this owner" });
    }

    const ownerDetails = await User.findById(ownerId).select(
      "username companyName companyDescription"
    );

    if (!ownerDetails) {
      return res.status(404).json({ message: "Owner not found" });
    }

    const result = {
      ...ownerStats[0],
      owner: ownerDetails,
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get owner stats by home ID
router.get("/home-owner-stats/:homeId", async (req, res) => {
  try {
    const homeId = req.params.homeId;

    if (!mongoose.Types.ObjectId.isValid(homeId)) {
      return res.status(400).json({ message: "Invalid home ID" });
    }

    // First, find the home to get the owner ID
    const home = await Home.findById(homeId);
    if (!home) {
      return res.status(404).json({ message: "Home not found" });
    }

    const ownerId = home.owner;

    // Now use the owner ID to get the stats
    const ownerStats = await Home.aggregate([
      { $match: { owner: ownerId } },
      {
        $group: {
          _id: "$owner",
          totalHomes: { $sum: 1 },
          totalReviews: { $sum: { $size: "$reviews" } },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    if (ownerStats.length === 0) {
      return res.status(404).json({ message: "No stats found for this owner" });
    }

    const ownerDetails = await User.findById(ownerId).select(
      "username companyName companyDescription"
    );

    if (!ownerDetails) {
      return res.status(404).json({ message: "Owner not found" });
    }

    const result = {
      ...ownerStats[0],
      owner: ownerDetails,
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
