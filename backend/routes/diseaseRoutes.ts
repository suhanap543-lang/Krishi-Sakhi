import express, { Router } from 'express';
import * as diseaseController from '../controllers/diseaseController';
import multer from 'multer';

const router: Router = express.Router();

// We need multer to handle multipart/form-data for the image upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// POST /api/disease/detect
router.post('/detect', upload.single('image'), diseaseController.detectDisease);

export default router;
