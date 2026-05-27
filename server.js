import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';

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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Mock API Routes for Peta Tutur Features
app.get('/api/catalog', (req, res) => {
    res.json([
        { id: 1, region: 'Jawa Barat', narratives: 12, description: 'Tanah Pasundan...' },
        { id: 2, region: 'DI Yogyakarta', narratives: 18, description: 'Pusat kebudayaan...' },
        { id: 3, region: 'Bali', narratives: 24, description: 'Pulau Dewata...' }
    ]);
});

app.post('/api/itinerary', (req, res) => {
    const { region, hours } = req.body;
    res.json({
        region,
        hours,
        route: [
            { time: '09:00', location: 'Situs Budaya A', desc: 'Narasi sejarah...' },
            { time: '13:00', location: 'Situs Budaya B', desc: 'Tradisi lokal...' }
        ]
    });
});

app.get('/api/history', (req, res) => {
    res.json([
        { id: 101, date: '2026-05-24', title: 'Eksplorasi Bandung Utara', status: 'Draft' },
        { id: 102, date: '2026-05-20', title: 'Jejak Mataram Kuno', status: 'Completed' }
    ]);
});
