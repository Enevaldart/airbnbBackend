const User = require('../models/user');  // Adjust the path to your user model
const bcrypt = require('bcrypt');

async function createInitialAdmin() {
  try {
    // Check if any admin user already exists
    const adminExists = await User.findOne({ role: "admin" });

    if (!adminExists) {
      // Get admin credentials from environment variables
      const username = process.env.ADMIN_USERNAME || "admin";
      const email = process.env.ADMIN_EMAIL || "admin@example.com";
      const password = process.env.ADMIN_PASSWORD || "admin123";
      
      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdmin = new User({
        username,
        email,
        password: hashedPassword,
        role: "admin",
        companyName: "Admin Corp",
        languagesSpoken: ["English"],
        companyDescription: "First admin user",
      });

      // Save the admin user to the database
      await newAdmin.save();
      console.log("Admin user created:", email);
    } else {
      console.log("Admin user already exists.");
    }
  } catch (err) {
    console.error("Error creating initial admin:", err);
  }
}

module.exports = createInitialAdmin;
