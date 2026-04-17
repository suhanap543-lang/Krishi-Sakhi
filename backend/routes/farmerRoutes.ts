import express, { Router } from 'express';
import * as farmerController from '../controllers/farmerController';

const router: Router = express.Router();

// POST /api/farmers/login/  — Sign in by phone
router.post('/login', farmerController.login);
router.post('/login/', farmerController.login);

// GET /api/farmers/summary/  — Lightweight list (id, name, district)
router.get('/summary', farmerController.farmerSummary);
router.get('/summary/', farmerController.farmerSummary);

// GET  /api/farmers/         — List all farmers
// POST /api/farmers/         — Create new farmer (sign up)
router.get('/', farmerController.listFarmers);
router.post('/', farmerController.createFarmer);

// GET    /api/farmers/:id/dashboard/ — Dashboard data
router.get('/:id/dashboard', farmerController.getFarmerDashboard);
router.get('/:id/dashboard/', farmerController.getFarmerDashboard);

// GET    /api/farmers/:id/   — Get farmer by ID
// PUT    /api/farmers/:id/   — Update farmer
// DELETE /api/farmers/:id/   — Delete farmer
router.get('/:id', farmerController.getFarmer);
router.get('/:id/', farmerController.getFarmer);
router.put('/:id', farmerController.updateFarmer);
router.put('/:id/', farmerController.updateFarmer);
router.delete('/:id', farmerController.deleteFarmer);
router.delete('/:id/', farmerController.deleteFarmer);

export default router;
