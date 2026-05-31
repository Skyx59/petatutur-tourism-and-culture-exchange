import express from 'express';
import db from '../db/db.js';
import { REGION_DATA } from '../db/seed-cultural-data.js';
import { COORDINATES_MAP, getDestType } from '../db/coordinates.js';

const router = express.Router();

function findSeedLocations(region) {
    const regionData = REGION_DATA.find(item => item.region === region);
    if (!regionData) return [];

    return regionData.locations.map(([city, name, description, category, tags]) => {
        const coords = COORDINATES_MAP[name] || { lat: null, lon: null };
        return {
            city,
            name,
            description,
            category,
            dest_type: getDestType(name, category),
            latitude: coords.lat,
            longitude: coords.lon,
            tags: JSON.stringify(tags)
        };
    });
}

function parseRouteData(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function toDateOnly(value) {
    if (!value) return '';
    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return String(value).slice(0, 10);
}

function deriveItineraryStatus(travelDate, routeData) {
    const dateOnly = toDateOnly(travelDate);
    if (!dateOnly) return 'Draft';

    const route = parseRouteData(routeData);
    const lastTime = route.length > 0 ? route[route.length - 1].time : '23:59';
    const [hours = '23', minutes = '59'] = String(lastTime).split(':');
    const endsAt = new Date(`${dateOnly}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

    return endsAt <= new Date() ? 'Completed' : 'Draft';
}

async function loadRegionLocations(region) {
    const seedLocations = findSeedLocations(region);

    try {
        const [locations] = await db.execute(
            'SELECT name, city, description, category, dest_type, latitude, longitude, tags FROM locations WHERE region = ?',
            [region]
        );
        
        // Pastikan koordinat terisi
        const enriched = locations.map(loc => {
            const coords = COORDINATES_MAP[loc.name] || { lat: null, lon: null };
            return {
                ...loc,
                dest_type: loc.dest_type || getDestType(loc.name, loc.category),
                latitude: loc.latitude !== null ? Number(loc.latitude) : coords.lat,
                longitude: loc.longitude !== null ? Number(loc.longitude) : coords.lon
            };
        });

        return seedLocations.length > 0 && enriched.length < seedLocations.length ? seedLocations : enriched;
    } catch (error) {
        if (seedLocations.length > 0) return seedLocations;
        throw error;
    }
}

async function fetchWeatherForDay(lat, lon, date) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weathercode&timezone=auto&start_date=${date}&end_date=${date}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Open-Meteo returned status ${response.status}`);
        const data = await response.json();
        if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
            throw new Error('No weather data for date');
        }
        
        const tempMax = data.daily.temperature_2m_max[0];
        const tempMin = data.daily.temperature_2m_min[0];
        const rainProb = data.daily.precipitation_probability_max[0] ?? 0;
        const precipitation = data.daily.precipitation_sum[0] ?? 0.0;
        const weatherCode = data.daily.weathercode[0] ?? 0;
        
        let description = 'Cerah';
        if (weatherCode >= 51 && weatherCode <= 67) {
            description = 'Gerimis / Hujan Ringan';
        } else if (weatherCode >= 80 && weatherCode <= 82) {
            description = 'Hujan Deras / Showers';
        } else if (weatherCode >= 95) {
            description = 'Badai Petir';
        } else if (weatherCode >= 1 && weatherCode <= 3) {
            description = 'Berawan';
        } else if (weatherCode === 45 || weatherCode === 48) {
            description = 'Berkabut';
        } else if (weatherCode >= 71 && weatherCode <= 77) {
            description = 'Bersalju';
        }

        return {
            temperature: Math.round((tempMax + tempMin) / 2),
            rain_probability: rainProb,
            precipitation,
            weather_code: weatherCode,
            description
        };
    } catch (error) {
        console.warn(`Weather fetch failed in itinerary helper: ${error.message}`);
        return {
            temperature: 28,
            rain_probability: 20,
            precipitation: 0.0,
            weather_code: 0,
            description: 'Cerah (Fallback)'
        };
    }
}

// GET /api/itinerary/history/:userId
router.get('/history/:userId', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT
                id,
                tourist_id,
                title,
                DATE_FORMAT(travel_date, '%Y-%m-%d') AS travel_date,
                region,
                hours,
                route_data,
                status,
                created_at
             FROM itineraries
             WHERE tourist_id = ?
             ORDER BY created_at DESC`,
            [req.params.userId]
        );

        const normalizedRows = rows.map(row => ({
            ...row,
            status: deriveItineraryStatus(row.travel_date, row.route_data)
        }));

        const completedIds = normalizedRows
            .filter(row => row.status === 'Completed')
            .map(row => row.id);

        if (completedIds.length > 0) {
            await Promise.all(completedIds.map(id => (
                db.execute('UPDATE itineraries SET status = ? WHERE id = ?', ['Completed', id])
            )));
        }

        res.json(normalizedRows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching history' });
    }
});

// POST /api/itinerary/generate
router.post('/generate', async (req, res) => {
    const { region, hours = 8, travelDate, days = 1, startHour = '09:00' } = req.body;
    try {
        const locations = await loadRegionLocations(region);

        if (locations.length === 0) {
            return res.status(404).json({ message: 'Wilayah belum memiliki data lokasi wisata.' });
        }

        // Tentukan koordinat tengah wilayah untuk query cuaca
        const validCoords = locations.filter(l => l.latitude !== null && l.longitude !== null);
        let centerLat = -6.2088;
        let centerLon = 106.8456;
        if (validCoords.length > 0) {
            centerLat = validCoords.reduce((sum, l) => sum + Number(l.latitude), 0) / validCoords.length;
            centerLon = validCoords.reduce((sum, l) => sum + Number(l.longitude), 0) / validCoords.length;
        }

        const startDate = new Date(travelDate);
        const visitedNames = new Set();
        const finalRoute = [];

        // Parse startHour
        let parsedStartHour = 9;
        let parsedStartMinute = 0;
        if (startHour && String(startHour).includes(':')) {
            const parts = String(startHour).split(':');
            parsedStartHour = Number(parts[0]) || 9;
            parsedStartMinute = Number(parts[1]) || 0;
        } else {
            parsedStartHour = Number(startHour) || 9;
        }

        const daysNum = Math.max(1, Number(days) || 1);

        for (let d = 0; d < daysNum; d++) {
            const currentDayDate = new Date(startDate);
            currentDayDate.setDate(startDate.getDate() + d);
            const dateStr = currentDayDate.toISOString().split('T')[0];

            // Ambil data cuaca untuk hari ini
            const weather = await fetchWeatherForDay(centerLat, centerLon, dateStr);
            const isRainy = weather.rain_probability > 50 || weather.weather_code >= 51 || weather.precipitation > 1.0;

            // Filter destinasi yang belum dikunjungi di hari sebelumnya
            let available = locations.filter(loc => !visitedNames.has(loc.name));
            if (available.length === 0) {
                visitedNames.clear();
                available = [...locations];
            }

            // Pengelompokan destinasi berdasarkan tipe untuk diprioritaskan sesuai cuaca
            let indoorPool = [];
            let outdoorPool = [];
            available.forEach(loc => {
                const type = loc.dest_type || getDestType(loc.name, loc.category);
                if (type === 'indoor') {
                    indoorPool.push(loc);
                } else {
                    outdoorPool.push(loc);
                }
            });

            // Acak urutan agar bersifat dinamis
            indoorPool.sort(() => 0.5 - Math.random());
            outdoorPool.sort(() => 0.5 - Math.random());

            let dayCandidates = [];
            let dayWarning = '';

            if (isRainy) {
                dayCandidates = [...indoorPool, ...outdoorPool];
                dayWarning = `⚠️ Prakiraan Cuaca: ${weather.description} (${weather.rain_probability}% probabilitas hujan). Disarankan memprioritaskan destinasi indoor atau membawa payung.`;
            } else {
                dayCandidates = [...outdoorPool, ...indoorPool];
                dayWarning = `☀️ Prakiraan Cuaca: ${weather.description}. Sangat cocok untuk menjelajah aktivitas outdoor/alam.`;
            }

            // Tentukan jumlah destinasi per hari (2 jam per destinasi)
            const dailyDuration = Number(hours) || 8;
            const spotCount = Math.min(dayCandidates.length, Math.floor(dailyDuration / 2));
            const selectedForDay = dayCandidates.slice(0, spotCount);

            // Waktu mulai yang sedikit berbeda per hari (Day 1: startHour, Day 2: startHour + 30m, Day 3: startHour - 30m)
            let dayStartHour = parsedStartHour;
            let dayStartMin = parsedStartMinute;
            if (d === 1) {
                dayStartMin += 30;
                if (dayStartMin >= 60) {
                    dayStartHour += 1;
                    dayStartMin -= 60;
                }
            } else if (d === 2) {
                dayStartMin -= 30;
                if (dayStartMin < 0) {
                    dayStartHour -= 1;
                    dayStartMin += 60;
                }
            }

            const formattedDayDate = currentDayDate.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            // Tambahkan entri header hari ke timeline
            finalRoute.push({
                time: `HARI ${d + 1} - ${formattedDayDate}`,
                location: `Prakiraan Cuaca: ${weather.description} (${weather.temperature}°C)`,
                category: 'Info Cuaca',
                desc: dayWarning
            });

            let currentHour = dayStartHour;
            let currentMin = dayStartMin;

            selectedForDay.forEach(loc => {
                visitedNames.add(loc.name);
                
                const timeString = String(currentHour).padStart(2, '0') + ':' + String(currentMin).padStart(2, '0');
                
                let itemWarning = '';
                const type = loc.dest_type || getDestType(loc.name, loc.category);
                if (isRainy && type !== 'indoor') {
                    itemWarning = ' ⚠️ (Peringatan: Lokasi outdoor, disarankan bawa payung/jas hujan)';
                }

                currentHour += 2;
                if (currentHour >= 24) currentHour -= 24;

                finalRoute.push({
                    time: timeString,
                    location: loc.name,
                    category: loc.category,
                    dest_type: type,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    desc: `${loc.description} Kategori: ${loc.category}${loc.city ? ` di ${loc.city}` : ''}.${itemWarning}`
                });
            });
        }

        res.json({
            title: `Rencana Perjalanan: ${region} (${daysNum} Hari)`,
            region,
            travelDate,
            days: daysNum,
            hours,
            route: finalRoute
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating itinerary' });
    }
});

// POST /api/itinerary/save
router.post('/save', async (req, res) => {
    const { touristId, title, travelDate, region, hours, routeData } = req.body;
    try {
        const status = deriveItineraryStatus(travelDate, routeData);
        const [result] = await db.execute(
            'INSERT INTO itineraries (tourist_id, title, travel_date, region, hours, route_data, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [touristId, title, travelDate, region, hours, JSON.stringify(routeData), status]
        );
        res.status(201).json({
            message: status === 'Completed'
                ? 'Itinerary tersimpan sebagai selesai karena waktu perjalanan sudah berlalu.'
                : 'Itinerary berhasil disimpan sebagai pending.',
            id: result.insertId,
            status
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving itinerary' });
    }
});

export default router;
