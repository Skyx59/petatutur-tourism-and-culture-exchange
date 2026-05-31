import express from 'express';
import db from '../db/db.js';

const router = express.Router();

const REGION_META = {
    'DKI Jakarta': {
        description: 'Ruang temu Betawi, sejarah kolonial, museum nasional, dan kampung kota yang terus bergerak.',
        tags: ['betawi', 'sejarah', 'museum', 'maritim']
    },
    'Jawa Barat': {
        description: 'Tanah Pasundan dengan seni bambu, kampung adat, arsitektur kota, dan bentang alam vulkanik.',
        tags: ['sunda', 'angklung', 'kampung adat', 'vulkanik']
    },
    'Jawa Tengah': {
        description: 'Ruang candi, batik, kota lama, pesantren pesisir, dan lanskap pegunungan Jawa bagian tengah.',
        tags: ['candi', 'batik', 'jawa', 'kota lama']
    },
    'DI Yogyakarta': {
        description: 'Pusat kebudayaan Jawa dengan keraton, situs arkeologi, kampung kerajinan, dan narasi rakyat pesisir.',
        tags: ['keraton', 'batik', 'candi', 'jawa']
    },
    'Jawa Timur': {
        description: 'Bentang Majapahit, gunung api, pesantren pesisir, dan kota-kota lama di timur Jawa.',
        tags: ['majapahit', 'bromo', 'pesisir', 'candi']
    },
    Bali: {
        description: 'Pulau dengan desa adat, pura, subak, seni pertunjukan, dan lanskap sawah yang hidup bersama ritual.',
        tags: ['desa adat', 'pura', 'subak', 'ritual']
    },
    'Sumatera Barat': {
        description: 'Ranah Minang dengan rumah gadang, tradisi merantau, surau, kuliner, dan lanskap lembah vulkanik.',
        tags: ['minangkabau', 'rumah gadang', 'merantau', 'surau']
    },
    'Sumatera Utara': {
        description: 'Ruang Danau Toba, budaya Batak, kota Medan, perkebunan, dan koridor alam Sumatera bagian utara.',
        tags: ['batak', 'danau toba', 'medan', 'rumah adat']
    },
    Aceh: {
        description: 'Serambi Makkah dengan masjid bersejarah, memori tsunami, benteng pesisir, dan tradisi gampong.',
        tags: ['aceh', 'islam', 'tsunami', 'gampong']
    },
    'Sulawesi Selatan': {
        description: 'Bentang Bugis-Makassar, karst Maros, pelabuhan, benteng, dan tradisi Toraja di pegunungan.',
        tags: ['bugis', 'makassar', 'toraja', 'karst']
    },
    'Nusa Tenggara Barat': {
        description: 'Ruang Sasak, Rinjani, desa tenun, masjid tua, dan pesisir Lombok-Sumbawa.',
        tags: ['sasak', 'rinjani', 'tenun', 'desa adat']
    },
    'Kalimantan Timur': {
        description: 'Ruang Dayak, Kutai, hutan tropis, sungai, pesisir, dan kota-kota tambang serta pelabuhan.',
        tags: ['dayak', 'kutai', 'hutan', 'sungai']
    }
};

function parseJsonArray(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// GET /api/catalog - Get all regions with narrative counts
router.get('/', async (req, res) => {
    try {
        const [regions] = await db.execute(`
            SELECT
                l.region,
                COUNT(DISTINCT l.id) AS location_count,
                COUNT(n.id) AS narrative_count
            FROM locations l
            LEFT JOIN narratives n
                ON n.location_id = l.id
               AND n.approval_status = 'approved'
            GROUP BY l.region
            ORDER BY l.region
        `);

        const result = regions.map(r => ({
            region: r.region,
            count: Number(r.narrative_count) || Number(r.location_count),
            locationCount: Number(r.location_count),
            description: REGION_META[r.region]?.description || 'Jelajahi keunikan budaya wilayah ini.',
            tags: REGION_META[r.region]?.tags || []
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching catalog' });
    }
});

router.get('/:region/narratives', async (req, res) => {
    const { region } = req.params;
    try {
        const [rows] = await db.execute(
            `SELECT
                l.id AS location_id,
                l.city,
                l.name,
                l.description AS location_description,
                l.category,
                l.tags AS location_tags,
                n.id AS narrative_id,
                n.title,
                n.description AS narrative_description,
                n.narrative_type,
                n.media_type,
                n.media_path,
                n.tags AS narrative_tags,
                u.name AS provider_name
            FROM locations l
            LEFT JOIN narratives n
                ON n.location_id = l.id
               AND n.approval_status = 'approved'
            LEFT JOIN users u ON u.id = n.provider_id
            WHERE l.region = ?
            ORDER BY l.city, l.name, n.narrative_type, n.id`,
            [region]
        );

        const grouped = new Map();
        rows.forEach(row => {
            if (!grouped.has(row.location_id)) {
                grouped.set(row.location_id, {
                    id: row.location_id,
                    city: row.city,
                    name: row.name,
                    description: row.location_description,
                    category: row.category,
                    tags: parseJsonArray(row.location_tags),
                    narratives: []
                });
            }

            if (row.narrative_id) {
                grouped.get(row.location_id).narratives.push({
                    id: row.narrative_id,
                    title: row.title || row.name,
                    description: row.narrative_description,
                    narrativeType: row.narrative_type || 'Cerita/Narasi',
                    mediaType: row.media_type || 'text',
                    mediaPath: row.media_path || '',
                    providerName: row.provider_name || 'Peta Tutur',
                    tags: parseJsonArray(row.narrative_tags)
                });
            }
        });

        res.json([...grouped.values()]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching narratives' });
    }
});

export default router;
