import express, { Router } from 'express';
import {
  consultantLogin,
  consultantSignup,
  listConsultationsForOfficer,
  approveConsultation,
  rejectConsultation,
  completeConsultation,
  getConsultantProfile,
  startVideoCall,
  getVideoCallInfo,
} from '../controllers/consultantController';

const router: Router = express.Router();

router.post('/login', consultantLogin);
router.post('/signup', consultantSignup);
router.get('/consultations', listConsultationsForOfficer);
router.patch('/consultations/:id/approve', approveConsultation);
router.patch('/consultations/:id/reject', rejectConsultation);
router.patch('/consultations/:id/complete', completeConsultation);
router.get('/profile/:id', getConsultantProfile);
router.patch('/consultations/:id/start-call', startVideoCall);
router.get('/consultations/:id/call-info', getVideoCallInfo);

export default router;
