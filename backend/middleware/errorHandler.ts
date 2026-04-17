// Global error handling middleware
// Add more custom error handling logic here as the app grows

import { Request, Response, NextFunction } from 'express';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err.message);

  // Axios errors (from OpenWeatherMap calls)
  if (err.response) {
    return res.status(err.response.status || 502).json({
      error: 'External API error',
      message: err.response.data?.message || err.message,
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    return res.status(400).json({ error: 'Validation Error', messages });
  }

  // Make sure err.status is a valid HTTP status code
  let statusCode = parseInt(err.status, 10);
  if (isNaN(statusCode) || statusCode < 100 || statusCode >= 600) {
    statusCode = 500;
  }

  // Default
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
  });
};

export default errorHandler;
