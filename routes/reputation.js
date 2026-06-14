import express from 'express';
import db from '../db/db.js';

const router = express.Router();
const ALLOWED_ROLES = ['Turis', 'Superadmin'];

const ensureReputationTable = async () => {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS reputation_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tourist_id INT NOT NULL,
                subject_name VARCHAR(255) NOT NULL,
                subject_type ENUM('Lokasi Budaya', 'Penyedia Jasa', 'Itinerary') DEFAULT 'Lokasi Budaya',
                rating TINYINT NOT NULL,
                comment TEXT NOT NULL,
                media_path VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tourist_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT chk_reputation_rating CHECK (rating BETWEEN 1 AND 5)
            )
        `);
        // Try to add column if it was created previously without media_path
        try {
            await db.execute(`
                ALTER TABLE reputation_reviews ADD COLUMN media_path VARCHAR(255) DEFAULT NULL
            `);
        } catch (alterError) {
            // Ignore if column already exists (ER_DUP_FIELDNAME / 1060)
            if (alterError.code !== 'ER_DUP_FIELDNAME' && alterError.errno !== 1060) {
                console.warn('Gagal menambahkan kolom media_path:', alterError.message);
            }
        }
    } catch (error) {
        if (['ER_TABLEACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(error.code)) {
            return;
        }
        throw error;
    }
};

const requireReputationAccess = (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (ALLOWED_ROLES.includes(role)) return next();
    res.status(403).json({ message: 'Akses reputation hanya untuk Turis dan Superadmin.' });
};

// GET /api/reputation
router.get('/', requireReputationAccess, async (req, res) => {
    try {
        await ensureReputationTable();

        const [reviews] = await db.execute(`
            SELECT
                r.id,
                r.tourist_id,
                r.subject_name,
                r.subject_type,
                r.rating,
                r.comment,
                r.media_path,
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
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.json({
                summary: { total_reviews: 0, average_rating: 0 },
                reviews: []
            });
        }
        res.status(500).json({ message: 'Gagal memuat data reputation.' });
    }
});

// POST /api/reputation
router.post('/', requireReputationAccess, async (req, res) => {
    const userId = Number(req.headers['x-user-id']);
    const { subjectName, subjectType = 'Lokasi Budaya', rating, comment, mediaPath = null } = req.body;
    const numericRating = Number(rating);

    if (!userId || !subjectName || !comment || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: 'Subjek, rating 1-5, dan ulasan wajib diisi.' });
    }

    try {
        await ensureReputationTable();

        const [result] = await db.execute(
            'INSERT INTO reputation_reviews (tourist_id, subject_name, subject_type, rating, comment, media_path) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, subjectName, subjectType, numericRating, comment, mediaPath]
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
