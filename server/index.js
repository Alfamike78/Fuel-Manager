import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import companiesRoutes from './routes/companies.js';
import profileRoutes from './routes/profile.js';
import basesRouter from './routes/bases.js';
import tanksRouter from './routes/tanks.js';
import tankLoadsRouter from './routes/tank-loads.js';
import qualityChecksRouter from './routes/quality-checks.js';
import aircraftRouter from './routes/aircraft.js';
import groundVehiclesRouter from './routes/ground-vehicles.js';
import fuelingOperationsRouter from './routes/fueling-operations.js';
import reportsRouter from './routes/reports.js';
import usersRouter from './routes/users.js';
import notificationsRouter from './routes/notifications.js';
import companySettingsRouter from './routes/company-settings.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Fuel Manager API', version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bases', basesRouter);
app.use('/api/tanks', tanksRouter);
app.use('/api/tank-loads', tankLoadsRouter);
app.use('/api/quality-checks', qualityChecksRouter);
app.use('/api/aircraft', aircraftRouter);
app.use('/api/ground-vehicles', groundVehiclesRouter);
app.use('/api/fueling-operations', fuelingOperationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/company-settings', companySettingsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Fuel Manager server running on port ${PORT}`);
});

export default app;
