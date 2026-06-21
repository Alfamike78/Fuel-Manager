export const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err);

  // Postgres errors
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry', detail: err.detail });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Foreign key constraint violation', detail: err.detail });
  }
  if (err.code === '23502') {
    return res.status(400).json({ error: 'Not null constraint violation', detail: err.detail });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(403).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Validation errors
  if (err.type === 'validation') {
    return res.status(400).json({ error: err.message, fields: err.fields });
  }

  // Default
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
