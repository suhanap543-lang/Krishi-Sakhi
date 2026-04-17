import express, { Router } from 'express';
import { geminiChat, getSuggestions } from '../controllers/chatController';

const router: Router = express.Router();

router.post("/gemini", geminiChat);
router.get("/suggestions", getSuggestions);

export default router;
