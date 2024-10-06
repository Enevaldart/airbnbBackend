const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  home: { type: mongoose.Schema.Types.ObjectId, ref: "Home", required: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  clientPhone: { type: String, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "confirmed", "canceled"],
    default: "confirmed",
  },
  paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
  reviewLink: String,
  reviewLinkSentAt: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Booking", bookingSchema);
