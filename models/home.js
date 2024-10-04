const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: { type: String, required: true },
  comment: String,
  rating: Number,
  date: {
    type: Date,
    default: Date.now,
  }
});

const homeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: [String], required: true },
  rating: { type: Number, default: 0 },
  bedrooms: { type: Number, default: 1 },
  beds: { type : String, default: 1 },
  reviews: { type: [reviewSchema], default: [] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amenities: { type: [String], default: [] },
  maxGuests: { type: Number, required: true },
  isGuestNumberFixed: { type: Boolean, default: false }
});

module.exports = mongoose.model("Home", homeSchema);
