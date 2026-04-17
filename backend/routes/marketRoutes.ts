import express, { Router } from 'express';
import {
  getCrops,
  getPrices,
  getPriceHistory,
  getInsights,
  createTransaction,
  listTransactions
} from '../controllers/marketController';

const router: Router = express.Router();

router.get('/crops', getCrops);
router.get('/prices', getPrices);
router.get('/price-history', getPriceHistory);
router.post('/insights', getInsights);
router.post('/transactions', createTransaction);
router.get('/transactions', listTransactions);

export default router;
