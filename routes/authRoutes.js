const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Sign up a new user
router.post("/signup", async (req, res) => {
    const { username, email, password, role } = req.body;
  
    try {
      // Check if the user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
  
      // Assign role or default to 'user'
      const userRole = role || 'user';
  
      // Create a new user
      const newUser = new User({ username, email, password, role: userRole });
      const savedUser = await newUser.save();
  
      res
        .status(201)
        .json({ message: "User created successfully", user: savedUser });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });


  router.put('/update-role/:id', async (req, res) => {
    const { role } = req.body;
    
    // Validate the role
    if (!['user', 'admin'].includes(role)) {
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
  
      res.json({ message: "User role updated successfully", user: updatedUser });
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
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "Logged in successfully", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
      const users = await User.find().select('-password'); // Exclude passwords from response
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });



module.exports = router;
