import express, { Router } from 'express';
import {
  listOfficers,
  getOfficer,
  bookConsultation,
  listConsultations,
  cancelConsultation,
  getAIExperts,
  saveAIExpert,
  getGovernmentHelplines
} from '../controllers/officerController';

const router: Router = express.Router();

router.get('/helplines', getGovernmentHelplines);
router.get('/ai-experts', getAIExperts);
router.post('/ai-experts/save', saveAIExpert);
router.get('/', listOfficers);
router.get('/:id', getOfficer);
router.post('/consultations', bookConsultation);
router.get('/consultations/list', listConsultations);
router.patch('/consultations/:id/cancel', cancelConsultation);

export default router;
