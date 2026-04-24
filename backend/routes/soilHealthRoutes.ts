import express, { Router } from 'express';
import { assessSoilHealth } from '../controllers/soilHealthController';

const router: Router = express.Router();

// POST /api/soil-health/assess
router.post('/assess', assessSoilHealth);

export default router;
