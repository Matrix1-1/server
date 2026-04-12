/**
 * TV Show Routes — public endpoints
 */

const express = require('express');
const TVShow  = require('../models/TVShow');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/tv — list shows with filters
router.get('/', async (req, res) => {
  try {
    const { search, genre, trending, featured, limit = 20, page = 1 } = req.query;
    const query = { isPublished: true };

    if (search)   query.$text = { $search: search };
    if (genre)    query.genre = { $regex: genre, $options: 'i' };
    if (trending) query.isTrending = true;
    if (featured) query.isFeatured = true;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await TVShow.countDocuments(query);
    const shows = await TVShow.find(query)
      .select('-seasons.episodes.streamSources') // don't send stream URLs in list
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ shows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tv/genres
router.get('/genres', async (req, res) => {
  try {
    const genres = await TVShow.distinct('genre');
    res.json(genres.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tv/:id — full show with seasons (no episode stream URLs)
router.get('/:id', async (req, res) => {
  try {
    const show = await TVShow.findById(req.params.id)
      .select('-seasons.episodes.streamSources');
    if (!show) return res.status(404).json({ message: 'Show not found' });
    await TVShow.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json(show);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tv/:id/season/:seasonNum — full season with episode stream URLs
router.get('/:id/season/:seasonNum', async (req, res) => {
  try {
    const show = await TVShow.findById(req.params.id);
    if (!show) return res.status(404).json({ message: 'Show not found' });
    const season = show.seasons.find(s => s.seasonNumber === parseInt(req.params.seasonNum));
    if (!season) return res.status(404).json({ message: 'Season not found' });
    res.json(season);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tv/:id/season/:seasonNum/episode/:epNum — single episode with stream URLs
router.get('/:id/season/:seasonNum/episode/:epNum', async (req, res) => {
  try {
    const show = await TVShow.findById(req.params.id);
    if (!show) return res.status(404).json({ message: 'Show not found' });
    const season = show.seasons.find(s => s.seasonNumber === parseInt(req.params.seasonNum));
    if (!season) return res.status(404).json({ message: 'Season not found' });
    const episode = season.episodes.find(e => e.episodeNumber === parseInt(req.params.epNum));
    if (!episode) return res.status(404).json({ message: 'Episode not found' });
    res.json({ show: { title: show.title, poster: show.poster }, season: season.seasonNumber, episode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
