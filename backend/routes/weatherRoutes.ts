import express, { Router } from 'express';
import * as weatherController from '../controllers/weatherController';

const router: Router = express.Router();

// GET /api/weather/current?district=X&state=Y
router.get('/current', weatherController.getCurrentWeather);

// GET /api/weather/daily?district=X&state=Y
router.get('/daily', weatherController.getDailyForecast);

// GET /api/weather/hourly?district=X&state=Y
router.get('/hourly', weatherController.getHourlyForecast);

export default router;
