import express, { Router } from 'express';
import { sttTranslate, translateText, translateBatch } from '../controllers/sarvamController';

const router: Router = express.Router();

// POST /api/sarvam/stt-translate — Audio file → English translated text
router.post('/stt-translate', ...sttTranslate);

// POST /api/sarvam/translate — Text → translated text
router.post('/translate', translateText);

// POST /api/sarvam/translate-batch — Array of texts → translated texts
router.post('/translate-batch', translateBatch);

export default router;
