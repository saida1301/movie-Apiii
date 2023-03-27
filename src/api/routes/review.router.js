const express = require("express");
const { getReviews } = require("../controllers/review.controller");
const { createReview } = require("../controllers/review.controller");

const router = express.Router();

router.get("/:id", getReviews);
router.post("/create", createReview);

module.exports = router;