/**
 * TV Show Routes — public endpoints
 * 4 best servers only
 */

const express = require('express');
const TVShow  = require('../models/TVShow');
const router  = express.Router();

function buildEpisodeSources(tmdbId, imdbId, season, episode) {
  const sources = [];
  if (tmdbId) sources.push({ provider: 'ezvidapi',     label: 'Server 1', url: `https://ezvidapi.com/embed/tv/${tmdbId}/${season}/${episode}`,                             quality: 'auto', isHLS: false });
  if (tmdbId) sources.push({ provider: 'vidbinge',     label: 'Server 2', url: `https://vidbinge.to/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,          quality: 'auto', isHLS: false });
  if (tmdbId) sources.push({ provider: 'embed-api',    label: 'Server 3', url: `https://player.embed-api.stream/?id=${tmdbId}&s=${season}&e=${episode}`,                  quality: 'auto', isHLS: false });
  if (tmdbId) sources.push({ provider: 'vidsrc.cc',    label: 'Server 4', url: `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`,                            quality: 'auto', isHLS: false });
  if (tmdbId) sources.push({ provider: 'vidsrc-embed', label: 'Server 5', url: `https://vidsrc-embed.su/embed/tv?tmdb=${tmdbId}&s=${season}&e=${episode}`,                quality: 'auto', isHLS: false });
  return sources;
}

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
    const shows = await TVShow.find(query).select('-seasons').sort('-createdAt').skip(skip).limit(parseInt(limit));
    res.json({ shows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/genres', async (req, res) => {
  try {
    const genres = await TVShow.distinct('genre');
    res.json(genres.filter(Boolean).sort());
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const show = await TVShow.findById(req.params.id).select('-seasons.episodes.streamSources');
    if (!show) return res.status(404).json({ message: 'Show not found' });
    await TVShow.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json(show);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id/season/:seasonNum', async (req, res) => {
  try {
    const show = await TVShow.findById(req.params.id);
    if (!show) return res.status(404).json({ message: 'Show not found' });
    const season = show.seasons.find(s => s.seasonNumber === parseInt(req.params.seasonNum));
    if (!season) return res.status(404).json({ message: 'Season not found' });
    const seasonObj = season.toObject();
    seasonObj.episodes = seasonObj.episodes.map(ep => ({
      ...ep,
      streamSources: buildEpisodeSources(show.tmdbId, show.imdbId, season.seasonNumber, ep.episodeNumber),
    }));
    res.json(seasonObj);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id/season/:seasonNum/episode/:epNum', async (req, res) => {
  try {
    const show = await TVShow.findById(req.params.id);
    if (!show) return res.status(404).json({ message: 'Show not found' });
    const season = show.seasons.find(s => s.seasonNumber === parseInt(req.params.seasonNum));
    if (!season) return res.status(404).json({ message: 'Season not found' });
    const episode = season.episodes.find(e => e.episodeNumber === parseInt(req.params.epNum));
    if (!episode) return res.status(404).json({ message: 'Episode not found' });
    const epObj = episode.toObject();
    epObj.streamSources = buildEpisodeSources(show.tmdbId, show.imdbId, season.seasonNumber, episode.episodeNumber);
    res.json({ show: { title: show.title, poster: show.poster }, season: season.seasonNumber, episode: epObj });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
