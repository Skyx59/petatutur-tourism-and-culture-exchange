import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Setup storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.query.type || 'general';
        // Validate type to prevent path traversal
        const allowedTypes = ['crowdsourcing', 'reputation', 'general'];
        const folderName = allowedTypes.includes(type) ? type : 'general';
        
        const uploadPath = path.join(__dirname, '../uploads', folderName);
        
        // Ensure directory exists
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const type = req.query.type || 'general';
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (type === 'reputation') {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.txt'];
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Jenis file tidak diizinkan untuk ulasan reputasi (hanya gambar, PDF, dan TXT).'));
        }
    } else if (type === 'crowdsourcing') {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.mp3', '.wav', '.pdf', '.doc', '.docx'];
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Jenis file tidak diizinkan untuk crowdsourcing (gambar, audio, PDF, atau dokumen Word saja).'));
        }
    } else {
        cb(null, true); // Allow any for general
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB limit
    }
});

router.post('/', (req, res) => {
    const role = req.headers['x-user-role'];
    if (!role) {
        return res.status(401).json({ message: 'Login diperlukan untuk mengunggah berkas.' });
    }

    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'Ukuran file terlalu besar (maksimum 5MB).' });
            }
            return res.status(400).json({ message: `Gagal mengunggah berkas: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
        }

        const type = req.query.type || 'general';
        const folderName = ['crowdsourcing', 'reputation', 'general'].includes(type) ? type : 'general';
        const relativePath = `/uploads/${folderName}/${req.file.filename}`;

        res.status(200).json({
            message: 'Berkas berhasil diunggah.',
            filePath: relativePath
        });
    });
});

export default router;
