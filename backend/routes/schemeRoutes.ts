import express, { Router } from 'express';
import { listSchemes, getScheme, searchSchemes } from '../controllers/schemeController';

const router: Router = express.Router();

router.get('/', listSchemes);
router.get('/search', searchSchemes);
router.get('/:id', getScheme);

export default router;
