const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  home: { type: mongoose.Schema.Types.ObjectId, ref: "Home", required: true }, // Home being booked
  clientName: { type: String, required: true },  // Client's name
  clientEmail: { type: String, required: true }, // Client's email
  clientPhone: { type: String, required: true }, // Client's phone
  checkIn: { type: Date, required: true },  // Check-in date
  checkOut: { type: Date, required: true }, // Check-out date
  totalPrice: { type: Number, required: true }, // Total price calculated by the server
  status: { type: String, enum: ["pending", "confirmed", "canceled"], default: "confirmed" },
  paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
  reviewLink: String,
  reviewLinkSentAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", bookingSchema);
