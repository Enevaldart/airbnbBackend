const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Booking = require("../models/booking");
const Home = require("../models/home");

// Create a new booking
router.post("/", async (req, res) => {
  try {
    const { homeId, clientName, clientEmail, clientPhone, checkIn, checkOut } =
      req.body;

    // Find the home being booked
    const home = await Home.findById(homeId);
    if (!home) return res.status(404).json({ message: "Home not found" });

    // Calculate total price (nights * price per night)
    const nights =
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
    const totalPrice = nights * home.price;

    // Create the booking with client details
    const newBooking = await Booking.create({
      home: homeId,
      clientName,
      clientEmail,
      clientPhone,
      checkIn,
      checkOut,
      totalPrice,
    });

    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ message: "Booking failed", error: error.message });
  }
});

//view all bookings
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().populate("home");
    res.json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to retrieve bookings", error: error.message });
  }
});

//view bookings for a specific home
router.get("/homes/:homeId/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find({ home: req.params.homeId }).populate(
      "home"
    );
    res.json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to retrieve bookings", error: error.message });
  }
});

module.exports = router;
