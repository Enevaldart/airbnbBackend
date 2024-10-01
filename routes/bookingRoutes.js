const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Booking = require("../models/booking");
const Home = require("../models/home");
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken'); // For generating a secure token

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Create a new booking
router.post("/", async (req, res) => {
  const { homeId, clientName, clientEmail, clientPhone, checkIn, checkOut } =
    req.body;

  try {
    // Validate request data
    if (
      !homeId ||
      !clientName ||
      !clientEmail ||
      !clientPhone ||
      !checkIn ||
      !checkOut
    ) {
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
      return res
        .status(400)
        .json({ message: "Check-out date must be after check-in date" });
    }

    // Calculate total price (nights * price per night)
    const calculatedPrice = nights * home.price;
    const totalPrice = calculatedPrice * 1.04;

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

    // Generate a JWT token for review (valid for 7 days)
    const reviewToken = jwt.sign(
      { bookingId: newBooking._id, homeId: homeId, clientEmail: clientEmail },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Token will expire in 7 days
    );

    // Generate review URL
    const reviewLink = `${process.env.FRONTEND_URL}/homes/${homeId}/review?token=${reviewToken}`;

    // Send confirmation email with review link
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender address
      to: clientEmail, // Receiver's email
      subject: "Booking Confirmation and Review Link",
      text: `Dear ${clientName},

Thank you for your booking! Here are your booking details:

- Hotel Name: ${home.name}
- Check-in Date: ${checkInDate.toDateString()}
- Check-out Date: ${checkOutDate.toDateString()}
- Total Price: Ksh ${totalPrice.toFixed(2)}

We would love to hear your feedback after your stay. Please leave a review using the link below:

${reviewLink}

This link is valid for 7 days. We look forward to hearing from you!

Best regards,
The Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        // Log the error, but still respond with booking details
        return res
          .status(500)
          .json({ message: "Booking successful, but email sending failed." });
      }
      console.log("Email sent:", info.response);
      // Respond with booking confirmation after email is sent
      return res.status(201).json(newBooking);
    });
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
    res
      .status(500)
      .json({ message: "Failed to retrieve bookings", error: error.message });
  }
});

// View all bookings with selected details
router.get("/summary", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .select(
        "createdAt checkIn checkOut clientName totalPrice home clientEmail clientPhone"
      ) // Select relevant fields
      .populate("home", "name") // Populate the home name only
      .lean(); // Convert Mongoose documents to plain JavaScript objects

    if (!bookings.length) {
      return res.status(404).json({ message: "No bookings found" });
    }

    // Format the bookings to show only the necessary details
    const formattedBookings = bookings.map((booking) => ({
      bookingTime: booking.createdAt,
      checkInDate: booking.checkIn,
      checkOutDate: booking.checkOut,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      homeName: booking.home.name, // Assuming the "home" model has a "name" field
      homeId: booking.home._id,
      totalPrice: booking.totalPrice,
    }));

    res.json(formattedBookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to retrieve bookings", error: error.message });
  }
});

// View bookings for a specific home
router.get("/homes/:homeId/bookings", async (req, res) => {
  try {
    const { homeId } = req.params;
    const bookings = await Booking.find({ home: homeId }).populate("home");

    if (!bookings.length) {
      return res
        .status(404)
        .json({ message: "No bookings found for this home" });
    }
    res.json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to retrieve bookings", error: error.message });
  }
});

module.exports = router;
