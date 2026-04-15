/**
 * Movie Routes
 * GET /api/movies        — list movies (search, filter, sort)
 * GET /api/movies/genres — get all genres
 * GET /api/movies/:id    — get single movie
 * GET /api/movies/:id/related — related movies
 * POST /api/movies/:id/view   — increment view count
 */

const express = require('express');
const Movie   = require('../models/Movie');

const router = express.Router();

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/movies
   Query params: search, genre, trending, featured, sort, limit, page
══════════════════════════════════════════════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      genre,
      trending,
      featured,
      sort     = 'createdAt',
      limit    = 20,
      page     = 1,
    } = req.query;

    const filter = { isPublished: true };

    if (search) {
      filter.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { cast:        { $regex: search, $options: 'i' } },
        { director:    { $regex: search, $options: 'i' } },
      ];
    }

    if (genre)    filter.genre    = { $in: [genre] };
    if (trending === 'true') filter.isTrending = true;
    if (featured === 'true') filter.isFeatured = true;

    const sortMap = {
      createdAt: { createdAt: -1 },
      rating:    { rating: -1 },
      year:      { year: -1 },
      views:     { views: -1 },
      title:     { title: 1 },
    };
    const sortObj = sortMap[sort] || { createdAt: -1 };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Movie.countDocuments(filter);
    const movies = await Movie.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    res.json({
      movies,
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/movies/genres
   Returns all unique genres in the database
══════════════════════════════════════════════════════════════════════════════ */
router.get('/genres', async (req, res) => {
  try {
    const genres = await Movie.distinct('genre');
    res.json(genres.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/movies/:id
   Single movie by MongoDB _id
══════════════════════════════════════════════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).select('-__v');
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/movies/:id/related
   Returns movies with matching genres, excluding current movie
══════════════════════════════════════════════════════════════════════════════ */
router.get('/:id/related', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });

    const related = await Movie.find({
      _id:         { $ne: movie._id },
      genre:       { $in: movie.genre },
      isPublished: true,
    })
      .sort({ rating: -1 })
      .limit(12)
      .select('-__v');

    res.json(related);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/movies/:id/view
   Increments view count — called when user starts watching
══════════════════════════════════════════════════════════════════════════════ */
router.post('/:id/view', async (req, res) => {
  try {
    await Movie.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/movies/download/movie?title=xxx&year=xxx
   Proxy YTS API to avoid CORS issues
══════════════════════════════════════════════════════════════════════════════ */
router.get('/download/movie', async (req, res) => {
  try {
    const { title, year } = req.query;
    if (!title) return res.status(400).json({ message: 'title is required' });
    const https = require('https');
    const url = `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(title)}&limit=5`;
    https.get(url, { headers: { 'User-Agent': 'RoyalQueen/1.0' } }, (r) => {
      let raw = '';
      r.on('data', c => raw += c);
      r.on('end', () => {
        try {
          const data = JSON.parse(raw);
          const movies = data.data?.movies || [];
          const match = year
            ? movies.find(m => m.year === parseInt(year)) || movies[0]
            : movies[0];
          if (match?.torrents?.length > 0) {
            res.json({ torrents: match.torrents.map(t => ({
              quality: t.quality,
              size: t.size,
              type: t.type,
              seeds: t.seeds,
              url: t.url,
            }))});
          } else {
            res.json({ torrents: [] });
          }
        } catch (e) {
          res.json({ torrents: [] });
        }
      });
    }).on('error', () => res.json({ torrents: [] }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/movies/download/tv?imdb_id=xxx&season=x&episode=x
   Proxy EZTV API to avoid CORS issues
══════════════════════════════════════════════════════════════════════════════ */
router.get('/download/tv', async (req, res) => {
  try {
    const { imdb_id, season, episode } = req.query;
    if (!imdb_id) return res.status(400).json({ message: 'imdb_id is required' });
    const https = require('https');
    const imdbNum = imdb_id.replace('tt', '');
    const url = `https://eztv.re/api/get-torrents?imdb_id=${imdbNum}&limit=20`;
    https.get(url, { headers: { 'User-Agent': 'RoyalQueen/1.0' } }, (r) => {
      let raw = '';
      r.on('data', c => raw += c);
      r.on('end', () => {
        try {
          const data = JSON.parse(raw);
          const torrents = data.torrents || [];
          const s = String(season).padStart(2, '0');
          const e = String(episode).padStart(2, '0');
          const epStr = `S${s}E${e}`;
          const matches = torrents.filter(t => t.title?.toUpperCase().includes(epStr));
          res.json({ torrents: matches.map(t => ({
            quality: t.title?.match(/\d{3,4}p/i)?.[0] || 'HD',
            size: t.size_bytes ? (t.size_bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB' : '?',
            seeds: t.seeds || 0,
            url: t.torrent_url,
            title: t.title,
          }))});
        } catch (e) {
          res.json({ torrents: [] });
        }
      });
    }).on('error', () => res.json({ torrents: [] }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
