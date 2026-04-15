/**
 * TV Scraper Routes
 * Search TMDB for TV shows, fetch seasons/episodes, build stream URLs, import to DB
 */

const express = require('express');
const https   = require('https');
const TVShow  = require('../models/TVShow');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

/* ─── HTTP helper ──────────────────────────────────────────────────────────── */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RoyalQueen/1.0' } }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('Invalid JSON: ' + url)); }
      });
    }).on('error', reject);
  });
}

/* ─── TMDB helpers ─────────────────────────────────────────────────────────── */
const TMDB_KEY  = () => process.env.TMDB_API_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/w500';
const BACK_BASE = 'https://image.tmdb.org/t/p/w1280';

function tmdbUrl(path, params = {}) {
  const p = new URLSearchParams({ api_key: TMDB_KEY(), ...params });
  return `${TMDB_BASE}${path}?${p}`;
}

function mapTmdbShow(s, details = null) {
  const src = details || s;
  const genres = (src.genres || []).map(g => g.name);
  return {
    tmdbId:       s.id,
    title:        s.name || s.original_name || '',
    description:  s.overview || '',
    year:         parseInt((s.first_air_date || '0').slice(0, 4)) || 0,
    endYear:      parseInt((details?.last_air_date || '0').slice(0, 4)) || 0,
    rating:       parseFloat((s.vote_average || 0).toFixed(1)),
    poster:       s.poster_path   ? IMG_BASE  + s.poster_path   : '',
    backdrop:     s.backdrop_path ? BACK_BASE + s.backdrop_path : '',
    genre:        genres.length ? genres : ['Drama'],
    status:       details?.status || 'Ended',
    network:      details?.networks?.[0]?.name || '',
    totalSeasons: details?.number_of_seasons || 0,
    cast:         (details?.credits?.cast || []).slice(0, 6).map(c => c.name),
    language:     s.original_language === 'en' ? 'English' : (s.original_language || 'English'),
  };
}

/* ─── Stream URL builder for TV episodes ──────────────────────────────────── */
function buildEpisodeSources(tmdbId, imdbId, season, episode) {
  const sources = [];
  if (tmdbId) sources.push({ provider: 'autoembed',  label: 'Server 1', url: `https://autoembed.co/tv/tmdb/${tmdbId}-${season}-${episode}`,           quality: 'auto', isHLS: false });
  if (tmdbId) sources.push({ provider: 'vidsrc',     label: 'Server 2', url: `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`, quality: 'auto', isHLS: false });
  if (imdbId) sources.push({ provider: 'embed.su',   label: 'Server 3', url: `https://embed.su/embed/tv/${imdbId}/${season}/${episode}`,                quality: 'auto', isHLS: false });
  if (tmdbId) sources.push({ provider: 'moviesapi',  label: 'Server 4', url: `https://moviesapi.club/tv/${tmdbId}-${season}-${episode}`,               quality: 'auto', isHLS: false });
  if (imdbId) sources.push({ provider: '2embed',     label: 'Server 5', url: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`,        quality: 'auto', isHLS: false });
  if (tmdbId) sources.push({ provider: 'embedrise',  label: 'Server 6', url: `https://embedrise.com/tv/${tmdbId}/${season}/${episode}`,                 quality: 'auto', isHLS: false });
  return sources;
}

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/tv-scraper/search?q=breaking+bad
══════════════════════════════════════════════════════════════════════════════ */
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q) return res.status(400).json({ message: 'q is required' });
    if (!TMDB_KEY()) return res.status(400).json({ message: 'TMDB_API_KEY not set' });
    const data = await fetchJSON(tmdbUrl('/search/tv', { query: q, page }));
    const shows = (data.results || []).slice(0, 20).map(s => mapTmdbShow(s));
    res.json({ shows, total: data.total_results, page: data.page });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/tv-scraper/popular?category=popular|top_rated|trending&page=1
══════════════════════════════════════════════════════════════════════════════ */
router.get('/popular', async (req, res) => {
  try {
    const { page = 1, category = 'popular' } = req.query;
    if (!TMDB_KEY()) return res.status(400).json({ message: 'TMDB_API_KEY not set' });
    const pathMap = {
      popular:   '/tv/popular',
      top_rated: '/tv/top_rated',
      trending:  '/trending/tv/week',
      airing:    '/tv/on_the_air',
    };
    const path = pathMap[category] || '/tv/popular';
    const data = await fetchJSON(tmdbUrl(path, { page }));
    const shows = (data.results || []).slice(0, 20).map(s => mapTmdbShow(s));
    res.json({ shows, total: data.total_results || shows.length, page: data.page || 1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   GET /api/tv-scraper/details/:tmdbId?seasons=true
   Full show details, optionally with all season/episode data + stream sources
══════════════════════════════════════════════════════════════════════════════ */
router.get('/details/:tmdbId', async (req, res) => {
  try {
    if (!TMDB_KEY()) return res.status(400).json({ message: 'TMDB_API_KEY not set' });
    const { seasons: fetchSeasons = 'false' } = req.query;

    const details = await fetchJSON(
      tmdbUrl(`/tv/${req.params.tmdbId}`, { append_to_response: 'credits,external_ids' })
    );
    const imdbId = details.external_ids?.imdb_id || '';
    const show   = mapTmdbShow(details, details);

    if (fetchSeasons !== 'true') {
      return res.json({ ...show, imdbId });
    }

    // Fetch all seasons with episodes
    const seasonPromises = [];
    for (let i = 1; i <= (details.number_of_seasons || 0); i++) {
      seasonPromises.push(fetchJSON(tmdbUrl(`/tv/${req.params.tmdbId}/season/${i}`)));
    }
    const seasonData = await Promise.all(seasonPromises);

    const seasons = seasonData.map((s) => ({
      seasonNumber: s.season_number,
      title:        s.name || `Season ${s.season_number}`,
      overview:     s.overview || '',
      poster:       s.poster_path ? IMG_BASE + s.poster_path : show.poster,
      airDate:      s.air_date || '',
      episodeCount: s.episodes?.length || 0,
      episodes: (s.episodes || []).map(ep => ({
        episodeNumber: ep.episode_number,
        title:         ep.name || `Episode ${ep.episode_number}`,
        overview:      ep.overview || '',
        airDate:       ep.air_date || '',
        runtime:       ep.runtime || 0,
        stillImage:    ep.still_path ? IMG_BASE + ep.still_path : '',
        streamSources: buildEpisodeSources(req.params.tmdbId, imdbId, s.season_number, ep.episode_number),
      })),
    }));

    res.json({ ...show, imdbId, seasons });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/tv-scraper/import
   Import one or more TV shows with all seasons+episodes into MongoDB
══════════════════════════════════════════════════════════════════════════════ */
router.post('/import', async (req, res) => {
  try {
    const { shows = [] } = req.body;
    if (!shows.length) return res.status(400).json({ message: 'No shows provided' });

    const results = { imported: 0, skipped: 0, errors: [] };

    for (const s of shows) {
      try {
        const exists = await TVShow.findOne({ title: { $regex: `^${s.title}$`, $options: 'i' } });
        if (exists) { results.skipped++; continue; }

        await TVShow.create({
          tmdbId:       s.tmdbId || null,
          imdbId:       s.imdbId || '',
          title:        s.title,
          description:  s.description || '',
          genre:        s.genre?.length ? s.genre : ['Drama'],
          year:         s.year || 0,
          endYear:      s.endYear || 0,
          rating:       s.rating || 0,
          poster:       s.poster || '',
          backdrop:     s.backdrop || '',
          status:       s.status || 'Ended',
          network:      s.network || '',
          language:     s.language || 'English',
          cast:         s.cast || [],
          totalSeasons: s.totalSeasons || s.seasons?.length || 0,
          seasons:      s.seasons || [],
          isFeatured:   s.isFeatured || false,
          isTrending:   s.isTrending || false,
          isPublished:  true,
        });
        results.imported++;
      } catch (e) {
        results.errors.push(`"${s.title}": ${e.message}`);
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   DELETE /api/tv-scraper/delete-all
══════════════════════════════════════════════════════════════════════════════ */
router.delete('/delete-all', async (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'DELETE_ALL_SHOWS') {
      return res.status(400).json({ message: 'Send { confirm: "DELETE_ALL_SHOWS" }' });
    }
    const result = await TVShow.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} shows.`, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
