const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Booking = require("../models/booking");
const Home = require("../models/home");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken"); // For generating a secure token

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
      { expiresIn: "7d" }
    );

    // Generate review URL
    const reviewLink = `${process.env.FRONTEND_URL}/homes/${homeId}/review?token=${reviewToken}`;

    // Save the review link in the booking
    newBooking.reviewLink = reviewLink;
    await newBooking.save(); // Ensure the booking is updated with the review link

    // Send confirmation email with booking details (without review link at this time)
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: "Booking Confirmation",
      text: `Dear ${clientName},

Thank you for your booking! Here are your booking details:

- Home Name: ${home.name}
- Check-in Date: ${checkInDate.toDateString()}
- Check-out Date: ${checkOutDate.toDateString()}
- Total Price: Ksh ${totalPrice.toFixed(2)}

We look forward to hosting you!

Best regards,
The Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res
          .status(500)
          .json({ message: "Booking successful, but email sending failed." });
      }
      console.log("Booking confirmation email sent:", info.response);
      return res.status(201).json(newBooking);
    });
  } catch (error) {
    res.status(500).json({ message: "Booking failed", error: error.message });
  }
});

// Create a review link
router.post("/create-review-link/:bookingId", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate(
      "home"
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.reviewLink) {
      return res
        .status(400)
        .json({ message: "Review link already exists for this booking" });
    }

    // Generate a JWT token for review (valid for 7 days)
    const reviewToken = jwt.sign(
      {
        bookingId: booking._id,
        homeId: booking.home._id,
        clientEmail: booking.clientEmail,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Generate review URL
    const reviewLink = `${process.env.FRONTEND_URL}/homes/${booking.home._id}/review?token=${reviewToken}`;

    // Save the review link in the booking
    booking.reviewLink = reviewLink;
    await booking.save();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: booking.clientEmail,
      subject: "Leave a Review for Your Stay",
      text: `Dear ${booking.clientName},

      We hope you enjoyed your stay at ${booking.home.name}. We would love to hear your feedback. Please leave a review using the link below:

      ${booking.reviewLink}

      This link is valid for 7 days. We look forward to your review!

      Best regards,
      The Team`,
    };

    await transporter.sendMail(mailOptions);

    // Update the booking to record that the review link was sent
    booking.reviewLinkSentAt = new Date();
    await booking.save();

    return res
      .status(200)
      .json({ message: "Review link created successfully", reviewLink });
  } catch (error) {
    console.error("Error creating review link:", error);
    return res
      .status(500)
      .json({ message: "Failed to create review link", error: error.message });
  }
});

// Modify the existing send-review-link route
router.post("/send-review-link/:bookingId", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate(
      "home"
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!booking.reviewLink) {
      return res
        .status(400)
        .json({ message: "Review link not generated for this booking" });
    }

    // Send the email with the saved review link
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: booking.clientEmail,
      subject: "Leave a Review for Your Stay",
      text: `Dear ${booking.clientName},

      We hope you enjoyed your stay at ${booking.home.name}. We would love to hear your feedback. Please leave a review using the link below:

      ${booking.reviewLink}

      This link is valid for 7 days. We look forward to your review!

      Best regards,
      The Team`,
    };

    await transporter.sendMail(mailOptions);

    // Update the booking to record that the review link was sent
    booking.reviewLinkSentAt = new Date();
    await booking.save();

    return res
      .status(200)
      .json({ message: "Review link email sent successfully." });
  } catch (error) {
    console.error("Error sending review link:", error);
    return res
      .status(500)
      .json({ message: "Failed to send review link", error: error.message });
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
      )
      .populate("home", "name")
      .lean();

    if (!bookings.length) {
      return res.status(404).json({ message: "No bookings found" });
    }

    const formattedBookings = bookings.map((booking) => ({
      bookingTime: booking.createdAt,
      checkInDate: booking.checkIn,
      checkOutDate: booking.checkOut,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      homeName: booking.home.name,
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
