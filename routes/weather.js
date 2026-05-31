import express from 'express';

const router = express.Router();

// GET /api/weather?lat=...&lon=...&date=...
router.get('/', async (req, res) => {
    const { lat, lon, date } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ message: 'Parameter lat (latitude) dan lon (longitude) diperlukan.' });
    }

    // Default ke tanggal hari ini jika tidak ada tanggal yang disediakan
    const targetDate = date ? String(date).slice(0, 10) : new Date().toISOString().split('T')[0];

    try {
        // Tentukan URL untuk memanggil API Open-Meteo
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weathercode&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Open-Meteo API merespons dengan status ${response.status}`);
        }

        const data = await response.json();

        if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
            throw new Error('Data prakiraan cuaca tidak ditemukan untuk tanggal tersebut.');
        }

        const tempMax = data.daily.temperature_2m_max[0];
        const tempMin = data.daily.temperature_2m_min[0];
        const rainProb = data.daily.precipitation_probability_max[0] ?? 0;
        const precipitation = data.daily.precipitation_sum[0] ?? 0.0;
        const weatherCode = data.daily.weathercode[0] ?? 0;

        // Pemetaan WMO weather code ke keterangan bahasa Indonesia
        let description = 'Cerah';
        if (weatherCode >= 51 && weatherCode <= 67) {
            description = 'Gerimis / Hujan Ringan';
        } else if (weatherCode >= 80 && weatherCode <= 82) {
            description = 'Hujan Deras / Showers';
        } else if (weatherCode >= 95) {
            description = 'Badai Petir';
        } else if (weatherCode >= 1 && weatherCode <= 3) {
            description = 'Berawan / Berawan Sebagian';
        } else if (weatherCode === 45 || weatherCode === 48) {
            description = 'Berkabut';
        } else if (weatherCode >= 71 && weatherCode <= 77) {
            description = 'Bersalju';
        }

        res.json({
            temperature: Math.round((tempMax + tempMin) / 2),
            tempMax,
            tempMin,
            rain_probability: rainProb,
            precipitation,
            weather_code: weatherCode,
            description,
            time: data.daily.time[0]
        });

    } catch (error) {
        console.warn(`Weather API Fallback triggered due to error: ${error.message}`);
        // Fallback jika API gagal, di luar jangkauan ramalan (out of range), atau tidak ada koneksi
        res.json({
            temperature: 28,
            tempMax: 31,
            tempMin: 25,
            rain_probability: 25,
            precipitation: 0.0,
            weather_code: 0,
            description: 'Cerah (Fallback/Offline)',
            time: targetDate,
            fallback: true
        });
    }
});

export default router;
