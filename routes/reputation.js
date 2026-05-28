import express from 'express';
import db from '../db/db.js';

const router = express.Router();
const ALLOWED_ROLES = ['Turis', 'Superadmin'];

const requireReputationAccess = (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (ALLOWED_ROLES.includes(role)) return next();
    res.status(403).json({ message: 'Akses reputation hanya untuk Turis dan Superadmin.' });
};

// GET /api/reputation
router.get('/', requireReputationAccess, async (req, res) => {
    try {
        const [reviews] = await db.execute(`
            SELECT
                r.id,
                r.tourist_id,
                r.subject_name,
                r.subject_type,
                r.rating,
                r.comment,
                r.created_at,
                u.name AS tourist_name
            FROM reputation_reviews r
            LEFT JOIN users u ON u.id = r.tourist_id
            ORDER BY r.created_at DESC
        `);

        const [summaryRows] = await db.execute(`
            SELECT
                COUNT(*) AS total_reviews,
                COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating
            FROM reputation_reviews
        `);

        res.json({
            summary: summaryRows[0],
            reviews
        });
    } catch (error) {
        console.error('Reputation list error:', error);
        res.status(500).json({ message: 'Gagal memuat data reputation.' });
    }
});

// POST /api/reputation
router.post('/', requireReputationAccess, async (req, res) => {
    const userId = Number(req.headers['x-user-id']);
    const { subjectName, subjectType = 'Lokasi Budaya', rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!userId || !subjectName || !comment || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: 'Subjek, rating 1-5, dan ulasan wajib diisi.' });
    }

    try {
        const [result] = await db.execute(
            'INSERT INTO reputation_reviews (tourist_id, subject_name, subject_type, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [userId, subjectName, subjectType, numericRating, comment]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Ulasan reputation berhasil dikirim.'
        });
    } catch (error) {
        console.error('Reputation create error:', error);
        res.status(500).json({ message: 'Gagal menyimpan ulasan reputation.' });
    }
});

export default router;
