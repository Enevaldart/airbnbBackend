const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  blacklistedTokens,
} = require("../middleware/authenticateToken");
const authorizeRole = require("../middleware/authorizeRole");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

//create a user
router.post("/signup", async (req, res) => {
  const { username, email, password, role, address, phoneNumber, idNumber } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Assign role or default to 'user'
    const userRole = role || "user";

    // Create a new user
    const newUser = new User({
      username,
      email,
      password,
      role: userRole,
      address,
      phoneNumber,
      idNumber
    });
    console.log("User object created:", newUser);

    // Save the user and handle specific errors
    const savedUser = await newUser.save();
    console.log("User saved:", savedUser);

    res.status(201).json({ message: "User created successfully", user: savedUser });
  } catch (err) {
    if (err.name === 'ValidationError') {
      console.error("Validation error:", err);
      return res.status(400).json({ message: "Validation error", error: err });
    } else if (err.code === 11000) {
      console.error("Duplicate key error:", err);
      return res.status(400).json({ message: "Email or username already in use" });
    } else {
      console.error("Error occurred:", err);
      res.status(500).json({ message: "An error occurred", error: err });
    }
  }
});


// Update user role (admin only)
router.put(
  "/update-role/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    const { role } = req.body;

    // Validate the role
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    try {
      // Find the user by ID and update the role
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "User role updated successfully",
        user: updatedUser,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Get all users (admin only)
router.get(
  "/users",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const users = await User.find().select("-password"); // Exclude passwords from response
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Fetch a user by ID
router.get(
  "/users/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      // Find the user by ID and exclude the password field from the response
      const user = await User.findById(req.params.id, "-password");

      // If the user is not found, return a 404 response
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return the user details in the response
      res.json(user);
    } catch (err) {
      // If there is an error (e.g., invalid ID format), return a 500 response
      res.status(500).json({ message: err.message });
    }
  }
);

// Fetch logged-in user's profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, "-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// User login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    res.json({ message: "Logged in successfully", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Sign out route
router.post("/signout", authenticateToken, (req, res) => {
  const token = req.token; // Get the token from the request

  // Add the token to the blacklist
  blacklistedTokens.add(token);

  res.json({ message: "Signed out successfully" });
});

// Update user profile (owner or admin only)
router.put("/profile", authenticateToken, async (req, res) => {
  const { username, email, address, phoneNumber, idNumber } = req.body;

  // Validate that the username and email are provided
  if (!username && !email && !address && !phoneNumber && !idNumber) {
    return res.status(400).json({ message: "At least one field must be provided to update." });
  }

  try {
    // Fetch the current user from the database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user is trying to update their own profile or if the requester is an admin
    if (req.user.id !== user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: You cannot update this profile" });
    }

    // Update fields only if they are provided
    if (username) user.username = username;
    if (email) user.email = email;
    if (address) user.address = address;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (idNumber) user.idNumber = idNumber;

    // Save the updated user profile
    const updatedUser = await user.save();

    // Exclude the password from the response
    const { password, ...userWithoutPassword } = updatedUser.toObject();

    res.json({ message: "Profile updated successfully", user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a user (admin only or self-deletion)
router.delete(
  "/users/:id",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      // Check if the user is trying to delete their own account
      if (req.user.id === req.params.id || req.user.role === "admin") {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User deleted successfully" });
      } else {
        res
          .status(403)
          .json({ message: "Forbidden: You cannot delete this user" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
