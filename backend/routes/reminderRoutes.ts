import express, { Router } from 'express';
import * as reminderController from '../controllers/reminderController';

const router: Router = express.Router();

// GET  /api/reminders/   — List reminders (filter by ?farmer_id=, ?category=, etc.)
// POST /api/reminders/   — Create new reminder
router.get('/', reminderController.listReminders);
router.post('/', reminderController.createReminder);

// POST   /api/reminders/:id/mark_completed/  — Toggle completion
router.post('/:id/mark_completed', reminderController.markCompleted);
router.post('/:id/mark_completed/', reminderController.markCompleted);

// DELETE /api/reminders/:id/  — Delete reminder
router.delete('/:id', reminderController.deleteReminder);
router.delete('/:id/', reminderController.deleteReminder);

export default router;
