/**
 * Admin Routes
 * CRUD operations for movies (admin only).
 * Poster uploads stored locally via multer.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Movie = require('../models/Movie');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ─── Multer Config (poster uploads) ──────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads/posters');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// ─── Movies ───────────────────────────────────────────────────────────────────

// GET /api/admin/movies — all movies including unpublished
router.get('/movies', async (req, res) => {
  try {
    const movies = await Movie.find().sort('-createdAt');
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/movies — create movie
router.post('/movies', upload.single('poster'), async (req, res) => {
  try {
    const data = { ...req.body };

    // Parse JSON fields sent as strings from multipart form
    if (typeof data.genre === 'string') {
      try { data.genre = JSON.parse(data.genre); } catch { data.genre = [data.genre]; }
    }
    if (typeof data.cast === 'string') {
      try { data.cast = JSON.parse(data.cast); } catch { data.cast = [data.cast]; }
    }
    if (typeof data.streamSources === 'string') {
      try { data.streamSources = JSON.parse(data.streamSources); } catch { data.streamSources = []; }
    }

    if (req.file) {
      data.poster = `/uploads/posters/${req.file.filename}`;
    }

    const movie = await Movie.create(data);
    res.status(201).json(movie);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/admin/movies/:id — update movie
router.put('/movies/:id', upload.single('poster'), async (req, res) => {
  try {
    const data = { ...req.body };

    if (typeof data.genre === 'string') {
      try { data.genre = JSON.parse(data.genre); } catch { data.genre = [data.genre]; }
    }
    if (typeof data.cast === 'string') {
      try { data.cast = JSON.parse(data.cast); } catch { data.cast = [data.cast]; }
    }
    if (typeof data.streamSources === 'string') {
      try { data.streamSources = JSON.parse(data.streamSources); } catch { data.streamSources = []; }
    }

    if (req.file) {
      data.poster = `/uploads/posters/${req.file.filename}`;
    }

    const movie = await Movie.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/admin/movies/:id
router.delete('/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json({ message: 'Movie deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Auto-fetch movie info from OMDB API ─────────────────────────────────────
// GET /api/admin/fetch-movie-info?title=Inception&year=2010
// Uses the free OMDB API (omdbapi.com) — no key needed for basic use,
// but a free key gives more requests. Set OMDB_API_KEY in .env for best results.
router.get('/fetch-movie-info', async (req, res) => {
  try {
    const { title, year } = req.query;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const apiKey = process.env.OMDB_API_KEY || 'trilogy'; // free demo key
    const yearParam = year ? `&y=${year}` : '';
    const url = `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}${yearParam}&plot=full`;

    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      https.get(url, (resp) => {
        let raw = '';
        resp.on('data', chunk => raw += chunk);
        resp.on('end', () => {
          try { resolve(JSON.parse(raw)); }
          catch (e) { reject(e); }
        });
      }).on('error', reject);
    });

    if (data.Response === 'False') {
      return res.status(404).json({ message: data.Error || 'Movie not found' });
    }

    // Map OMDB response to our schema
    const info = {
      title:       data.Title       || '',
      description: data.Plot        || '',
      year:        parseInt(data.Year) || new Date().getFullYear(),
      rating:      parseFloat(data.imdbRating) || 0,
      duration:    parseInt(data.Runtime)      || 0,
      director:    data.Director    || '',
      cast:        data.Actors ? data.Actors.split(',').map(s => s.trim()) : [],
      genre:       data.Genre  ? data.Genre.split(',').map(s => s.trim())  : [],
      poster:      (data.Poster && data.Poster !== 'N/A') ? data.Poster : '',
      language:    data.Language    || 'English',
      country:     data.Country     || '',
    };

    res.json(info);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch movie info: ' + err.message });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalMovies, totalUsers, topMovies] = await Promise.all([
      Movie.countDocuments(),
      User.countDocuments(),
      Movie.find().sort('-views').limit(5).select('title views'),
    ]);
    res.json({ totalMovies, totalUsers, topMovies });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
