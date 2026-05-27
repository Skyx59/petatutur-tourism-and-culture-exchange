import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock Auth Routes
app.post('/api/register', (req, res) => {
    const { name, email, role, specific_data } = req.body;
    console.log(`Registering user: ${name} (${role})`);
    
    // Status is 'pending' for Penyedia Jasa, 'approved' for Turis by default for this mock
    const status = role === 'Penyedia Jasa' ? 'pending' : 'approved';
    
    res.status(201).json({
        message: 'User registered successfully',
        user: { name, email, role, status, specific_data }
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt: ${email}`);
    
    // Mock login logic
    if (email === 'admin@petatutur.com' && password === 'admin123') {
        return res.json({
            message: 'Login successful',
            user: { name: 'Super Admin', role: 'Superadmin' }
        });
    }
    
    res.json({
        message: 'Login successful',
        user: { name: 'Budi Santoso', role: 'Turis' }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
