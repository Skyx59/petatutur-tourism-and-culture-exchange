import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import catalogRoutes from './routes/catalog.js';
import itineraryRoutes from './routes/itinerary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/itinerary', itineraryRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
