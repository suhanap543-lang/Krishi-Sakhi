import express, { Router } from 'express';
import * as farmController from '../controllers/farmController';

const router: Router = express.Router();

// GET  /api/farms/       — List all farms (filter by ?farmer_id= or ?farmer=)
// POST /api/farms/       — Create new farm
router.get('/', farmController.listFarms);
router.post('/', farmController.createFarm);

// GET    /api/farms/:id/   — Get farm by ID
// PUT    /api/farms/:id/   — Update farm
// DELETE /api/farms/:id/   — Delete farm
router.get('/:id', farmController.getFarm);
router.get('/:id/', farmController.getFarm);
router.put('/:id', farmController.updateFarm);
router.put('/:id/', farmController.updateFarm);
router.delete('/:id', farmController.deleteFarm);
router.delete('/:id/', farmController.deleteFarm);

export default router;
