import express, { Router } from 'express';
import * as activityController from '../controllers/activityController';

const router: Router = express.Router();

// POST /api/activities/quick_add/  — Log new activity
router.post('/quick_add', activityController.quickAdd);
router.post('/quick_add/', activityController.quickAdd);

// GET /api/activities/insights — AI-powered smart insights
router.get('/insights', activityController.getActivityInsights);

// GET  /api/activities/  — List activities (with query filters)
router.get('/', activityController.listActivities);

// GET    /api/activities/:id/  — Get activity by ID
// DELETE /api/activities/:id/  — Delete activity
router.get('/:id', activityController.getActivity);
router.get('/:id/', activityController.getActivity);
router.delete('/:id', activityController.deleteActivity);
router.delete('/:id/', activityController.deleteActivity);

export default router;
