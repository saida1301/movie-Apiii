import { Router } from "express";

import { getMovies } from "../controllers/movies.controller";

const router = Router();

router.get("/movies", getMovies);

export default router;