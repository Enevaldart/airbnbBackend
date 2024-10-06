// services/ownerService.js
const Home = mongoose.model("Home");
const Review = mongoose.model("Review");
const Owner = mongoose.model("Owner");

const getOwnerReviewStats = async (ownerId) => {
  try {
    const stats = await Home.aggregate([
      // ... the aggregation pipeline as defined above
    ]);
    return stats;
  } catch (err) {
    console.error(err);
    throw new Error("Error fetching owner review stats");
  }
};

module.exports = { getOwnerReviewStats };
