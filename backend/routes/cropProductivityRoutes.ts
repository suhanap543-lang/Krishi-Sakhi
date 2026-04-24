import express, { Router } from 'express';
import { analyzeCropProductivity } from '../controllers/cropProductivityController';

const router: Router = express.Router();

// POST /api/crop-productivity/analyze
router.post('/analyze', analyzeCropProductivity);

export default router;
