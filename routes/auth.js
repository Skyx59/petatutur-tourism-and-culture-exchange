import express from 'express';
import db from '../db/db.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, email, password, role, specific_data } = req.body;
    
    try {
        // Status is 'pending' for all new registrations (Superadmin is seeded separately)
        const status = 'pending';
        
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role, status, specific_data) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, password, role, status, JSON.stringify(specific_data || {})]
        );
        
        res.status(201).json({
            message: 'Registrasi berhasil. Akun menunggu persetujuan Superadmin.',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email sudah terdaftar.' });
        }
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [rows] = await db.execute(
            'SELECT id, name, email, password, role, status FROM users WHERE email = ?',
            [email]
        );
        
        if (rows.length === 0 || rows[0].password !== password) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }
        
        const user = rows[0];
        
        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Akun menunggu persetujuan Superadmin.' });
        }
        
        res.status(200).json({
            message: 'Login berhasil',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

export default router;
