import express from 'express';
import db from '../db/db.js';

const router = express.Router();

// Mock Middleware for Superadmin check
const isSuperadmin = (req, res, next) => {
    // In a real app, this would check a JWT or session
    // For now, we'll assume the requester provides their role in headers for simulation
    const role = req.headers['x-user-role'];
    if (role === 'Superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak. Hanya Superadmin yang diizinkan.' });
    }
};

// POST /api/admin/approve-user
router.post('/approve-user', isSuperadmin, async (req, res) => {
    const { user_id } = req.body;
    
    try {
        const [result] = await db.execute(
            'UPDATE users SET status = "approved" WHERE id = ?',
            [user_id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }
        
        res.status(200).json({ message: 'User berhasil disetujui.' });
    } catch (error) {
        console.error('Approval error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

export default router;
