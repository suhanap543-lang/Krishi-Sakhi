import express, { Router } from 'express';
import {
  getCropRecommendation,
  getRecommendationHistory,
} from '../controllers/recommendationController';

const router: Router = express.Router();

// POST /api/recommendations/crop
router.post('/crop', getCropRecommendation);

// GET /api/recommendations/history/:farmerId
router.get('/history/:farmerId', getRecommendationHistory);

export default router;
