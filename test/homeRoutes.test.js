const chai = require("chai");
const chaiHttp = require("chai-http");
const mongoose = require("mongoose");
const server = require("../server"); // Assuming your server is exported from server.js
const Home = require("../models/home");
const User = require("../models/user"); // Assuming you have a User model

const { expect } = chai;
chai.use(chaiHttp);

describe("Home Routes", () => {
  let token;
  let homeId;
  let userId;

  before(async () => {
    // Create a user and get a token for authentication
    const user = new User({ username: "testuser", password: "password" });
    await user.save();
    userId = user._id;
    
    // Replace this with actual authentication to get a valid token
    token = "Bearer " + user.generateAuthToken(); // Assume generateAuthToken() gives a valid token
  });

  after(async () => {
    // Clean up test database
    await User.deleteMany({});
    await Home.deleteMany({});
  });

  // Test for adding a new home
  describe("POST /homes", () => {
    it("should add a new home", (done) => {
      chai
        .request(server)
        .post("/homes")
        .set("Authorization", token)
        .send({
          name: "Test Home",
          description: "A beautiful home for testing",
          location: "Test Location",
          price: 500000,
          imageUrl: ["image1.jpg", "image2.jpg"], // Multiple images
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property("name", "Test Home");
          expect(res.body.imageUrl).to.be.an("array").with.lengthOf(2);
          homeId = res.body._id; // Save home ID for further tests
          done();
        });
    });
  });

  // Test for getting homes
  describe("GET /homes", () => {
    it("should get all homes", (done) => {
      chai
        .request(server)
        .get("/homes")
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an("array");
          done();
        });
    });
  });

  // Test for getting a single home by ID
  describe("GET /homes/:id", () => {
    it("should get a single home by ID", (done) => {
      chai
        .request(server)
        .get(`/homes/${homeId}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property("name", "Test Home");
          done();
        });
    });
  });

  // Test for updating a home
  describe("PUT /homes/:id", () => {
    it("should update a home", (done) => {
      chai
        .request(server)
        .put(`/homes/${homeId}`)
        .set("Authorization", token)
        .send({
          name: "Updated Test Home",
          imageUrl: ["image1.jpg", "image2.jpg", "image3.jpg"], // Adding another image
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property("name", "Updated Test Home");
          expect(res.body.imageUrl).to.be.an("array").with.lengthOf(3);
          done();
        });
    });
  });

  // Test for deleting a home
  describe("DELETE /homes/:id", () => {
    it("should delete a home by ID", (done) => {
      chai
        .request(server)
        .delete(`/homes/${homeId}`)
        .set("Authorization", token)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property("message", "Home deleted successfully");
          done();
        });
    });
  });
});
