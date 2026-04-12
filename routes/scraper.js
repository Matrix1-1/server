/**
 * Scraper Routes
 * - Search TMDB for movies (popular, trending, by genre, by query)
 * - Resolve embed URLs from VidSrc.to / 2embed.cc for any TMDB movie
 * - Preview before import; bulk-import into MongoDB
 * - Delete ALL movies at once (admin only)
 */

const express = require('express');
const https   = require('https');
const http    = require('http');
const Movie   = require('../models/Movie');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

/* ─── tiny HTTP helper ──────────────────────────────────────────────────────── */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'CineStream/1.0' } }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('Invalid JSON from: ' + url)); }
      });
    }).on('error', reject);
  });
}

/* ─── TMDB helpers ──────────────────────────────────────────────────────────── */
const TMDB_KEY  = () => process.env.TMDB_API_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/w500';
const BACK_BASE = 'https://image.tmdb.org/t/p/w1280';

function tmdbUrl(path, params = {}) {
  const p = new URLSearchParams({ api_key: TMDB_KEY(), ...params });
  return `${TMDB_BASE}${path}?${p}`;
}

function mapTmdbMovie(m, details = null) {
  const src = details || m;
  const genres = (src.genres || []).map(g => g.name)
    .concat((m.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean));
  const uniqueGenres = [...new Set(genres)].slice(0, 4);

  return {
    tmdbId:      m.id,
    title:       m.title || m.name || '',
    description: m.overview || '',
    year:        parseInt((m.release_date || m.first_air_date || '0').slice(0, 4)) || 0,
    rating:      parseFloat((m.vote_average || 0).toFixed(1)),
    poster:      m.poster_path  ? IMG_BASE  + m.poster_path  : '',
    backdrop:    m.backdrop_path ? BACK_BASE + m.backdrop_path : '',
    genre:       uniqueGenres.length ? uniqueGenres : ['Drama'],
    duration:    details?.runtime || 0,
    director:    details?.credits?.crew?.find(c => c.job === 'Director')?.name || '',
    cast:        (details?.credits?.cast || []).slice(0, 6).map(c => c.name),
    language:    m.original_language === 'en' ? 'English' : (m.original_language || 'English'),
  };
}

// TMDB genre id → name map
const GENRE_MAP = {
  28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',
  99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',
  27:'Horror',10402:'Musical',9648:'Mystery',10749:'Romance',878:'Sci-Fi',
  53:'Thriller',10752:'War',37:'Western',
};

/* ─── Stream URL builders ─────────────────────────────────────────────────── */
function buildStreamSources(tmdbId, imdbId) {
  const sources = [];

  // Server 1: autoembed.co
  if (tmdbId) sources.push({ provider:'vidstream', label:'Server 1', url:`https://autoembed.co/movie/tmdb/${tmdbId}`, quality:'auto', isHLS:false });

  // Server 2: vidsrc.xyz
  if (tmdbId) sources.push({ provider:'upcloud', label:'Server 2', url:`https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`, quality:'auto', isHLS:false });

  // Server 3: embed.su
  if (imdbId) sources.push({ provider:'filemoon', label:'Server 3', url:`https://embed.su/embed/movie/${imdbId}`, quality:'auto', isHLS:false });

  // Server 4: moviesapi.club
  if (tmdbId) sources.push({ provider:'streamtape', label:'Server 4', url:`https://moviesapi.club/movie/${tmdbId}`, quality:'auto', isHLS:false });

  // Server 5: 2embed.cc
  if (imdbId) sources.push({ provider:'doodstream', label:'Server 5', url:`https://www.2embed.cc/embed/${imdbId}`, quality:'auto', isHLS:false });

  // Server 6: embedrise
  if (tmdbId) sources.push({ provider:'mixdrop', label:'Server 6', url:`https://embedrise.com/movie/${tmdbId}`, quality:'auto', isHLS:false });

  return sources;
}

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/scraper/search?q=inception&page=1
   Search TMDB by title
══════════════════════════════════════════════════════════════════════════════ */
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q) return res.status(400).json({ message: 'q is required' });
    if (!TMDB_KEY()) return res.status(400).json({ message: 'TMDB_API_KEY not set in .env' });

    const data = await fetchJSON(tmdbUrl('/search/movie', { query: q, page, include_adult: false }));
    const movies = (data.results || []).slice(0, 20).map(m => mapTmdbMovie(m));
    res.json({ movies, total: data.total_results, page: data.page, pages: data.total_pages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/scraper/popular?page=1&category=popular|top_rated|trending|upcoming
══════════════════════════════════════════════════════════════════════════════ */
router.get('/popular', async (req, res) => {
  try {
    const { page = 1, category = 'popular' } = req.query;
    if (!TMDB_KEY()) return res.status(400).json({ message: 'TMDB_API_KEY not set in .env' });

    const pathMap = {
      popular:    '/movie/popular',
      top_rated:  '/movie/top_rated',
      upcoming:   '/movie/upcoming',
      trending:   '/trending/movie/week',
    };
    const path = pathMap[category] || '/movie/popular';
    const data = await fetchJSON(tmdbUrl(path, { page }));
    const movies = (data.results || []).slice(0, 20).map(m => mapTmdbMovie(m));
    res.json({ movies, total: data.total_results || movies.length, page: data.page || 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/scraper/by-genre?genre=28&page=1
   Browse by TMDB genre ID
══════════════════════════════════════════════════════════════════════════════ */
router.get('/by-genre', async (req, res) => {
  try {
    const { genre, page = 1 } = req.query;
    if (!genre) return res.status(400).json({ message: 'genre id required' });
    if (!TMDB_KEY()) return res.status(400).json({ message: 'TMDB_API_KEY not set in .env' });

    const data = await fetchJSON(tmdbUrl('/discover/movie', {
      with_genres: genre, page, sort_by: 'popularity.desc',
    }));
    const movies = (data.results || []).slice(0, 20).map(m => mapTmdbMovie(m));
    res.json({ movies, total: data.total_results, page: data.page, pages: data.total_pages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/scraper/details/:tmdbId
   Full details + stream sources for one movie
══════════════════════════════════════════════════════════════════════════════ */
router.get('/details/:tmdbId', async (req, res) => {
  try {
    if (!TMDB_KEY()) return res.status(400).json({ message: 'TMDB_API_KEY not set in .env' });

    const details = await fetchJSON(
      tmdbUrl(`/movie/${req.params.tmdbId}`, { append_to_response: 'credits' })
    );
    const movie = mapTmdbMovie(details, details);
    const imdbId = details.imdb_id || '';
    const streamSources = buildStreamSources(req.params.tmdbId, imdbId);

    res.json({ ...movie, imdbId, streamSources, primaryStreamUrl: streamSources[0]?.url || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/scraper/import
   Body: { movies: [{ tmdbId, title, ... streamSources, streamUrl }] }
   Bulk-imports pre-enriched movies into MongoDB (skips duplicates by title)
══════════════════════════════════════════════════════════════════════════════ */
router.post('/import', async (req, res) => {
  try {
    const { movies = [] } = req.body;
    if (!movies.length) return res.status(400).json({ message: 'No movies provided' });

    const results = { imported: 0, skipped: 0, errors: [] };

    for (const m of movies) {
      try {
        // Skip if title already exists
        const exists = await Movie.findOne({ title: { $regex: `^${m.title}$`, $options: 'i' } });
        if (exists) { results.skipped++; continue; }

        await Movie.create({
          title:         m.title,
          description:   m.description || '',
          year:          m.year || new Date().getFullYear(),
          rating:        m.rating || 0,
          poster:        m.poster || '',
          backdrop:      m.backdrop || '',
          genre:         m.genre?.length ? m.genre : ['Drama'],
          duration:      m.duration || 0,
          director:      m.director || '',
          cast:          m.cast || [],
          language:      m.language || 'English',
          streamUrl:     m.streamUrl || m.primaryStreamUrl || (m.streamSources?.[0]?.url || ''),
          streamSources: (m.streamSources || []).map(s => ({
            provider: s.provider || 'direct',
            quality:  s.quality  || 'auto',
            url:      s.url,
            isHLS:    s.isHLS   || false,
          })),
          isFeatured:  m.isFeatured  || false,
          isTrending:  m.isTrending  || false,
          isPublished: m.isPublished !== false,
        });
        results.imported++;
      } catch (e) {
        results.errors.push(`"${m.title}": ${e.message}`);
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   DELETE /api/scraper/delete-all
   Deletes every movie in the database — irreversible!
══════════════════════════════════════════════════════════════════════════════ */
router.delete('/delete-all', async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'DELETE_ALL_MOVIES') {
      return res.status(400).json({ message: 'Send { confirm: "DELETE_ALL_MOVIES" } to confirm' });
    }
    const result = await Movie.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} movies successfully.`, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/scraper/genres
   Returns TMDB genre list for UI dropdowns
══════════════════════════════════════════════════════════════════════════════ */
router.get('/genres', async (req, res) => {
  res.json(Object.entries(GENRE_MAP).map(([id, name]) => ({ id: Number(id), name })));
});

module.exports = router;
