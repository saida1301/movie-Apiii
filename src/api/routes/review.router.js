import { Router } from "express";
import { getReviews } from "../controllers/review.controller.js";

const router = Router();

router.get("/reviews/:id", getReviews);

export default router;