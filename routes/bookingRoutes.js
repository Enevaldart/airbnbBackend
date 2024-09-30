const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Booking = require("../models/booking");
const Home = require('../models/home');

// Create a new booking
router.post("/", async (req, res) => {
  const { homeId, clientName, clientEmail, clientPhone, checkIn, checkOut } = req.body;
  console.log(req.body); 
  try {
    // Validate request data
    if (!homeId || !clientName || !clientEmail || !clientPhone || !checkIn || !checkOut) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the home being booked
    const home = await Home.findById(homeId);
    if (!home) return res.status(404).json({ message: "Home not found" });

    // Calculate the number of nights
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const nights = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24);
    if (nights <= 0) {
      return res.status(400).json({ message: "Check-out date must be after check-in date" });
    }

    // Calculate total price (nights * price per night)
    const totalPrice = nights * home.price;

    // Create the booking
    const newBooking = await Booking.create({
      home: homeId,
      clientName,
      clientEmail,
      clientPhone,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      totalPrice,
    });

    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ message: "Booking failed", error: error.message });
  }
});

// View all bookings
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().populate("home");
    if (!bookings.length) {
      return res.status(404).json({ message: "No bookings found" });
    }
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve bookings", error: error.message });
  }
});

// View bookings for a specific home
router.get("/homes/:homeId/bookings", async (req, res) => {
  try {
    const { homeId } = req.params;
    const bookings = await Booking.find({ home: homeId }).populate("home");

    if (!bookings.length) {
      return res.status(404).json({ message: "No bookings found for this home" });
    }
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve bookings", error: error.message });
  }
});

module.exports = router;
