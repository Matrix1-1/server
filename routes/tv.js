/**
 * TV Show Routes — public endpoints
 * 10 best servers (Tier 1 + Tier 2)
 */

const express = require('express');
const TVShow  = require('../models/TVShow');
const router  = express.Router();

/**
 * TIER 1 — Best quality & speed (all TMDB-based)
 *   S1  vidsrc.to          – most popular, 1080p, auto-updated
 *   S2  vidlink.pro        – fast CDN, 1080p, low-ad player
 *   S3  player.videasy.net – 4K support, wide library, anime
 *   S4  vidsrc.sbs         – no-ads variant of vidsrc family, 1080p
 *   S5  vidsrc.mov         – multi-server failover, 1080p, subtitles
 * TIER 2 — Reliable fallbacks
 *   S6  vidfast.pro           – 4K/1080p (uses IMDB id)
 *   S7  multiembed.mov        – HLS multi-quality player (SuperEmbed)
 *   S8  player.autoembed.cc   – broad content, 1080p, anime
 *   S9  2embed.stream         – stable, clean player
 *   S10 embed.su              – clean UI, TMDB
 */
function buildEpisodeSources(tmdbId, imdbId, season, episode) {
  const sources = [];
  // ── Tier 1 ──
  if (tmdbId) sources.push({ provider: 'vidsrc.to',    label: 'Server 1',  url: `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,                             quality: '1080p', isHLS: false });
  if (tmdbId) sources.push({ provider: 'vidlink',      label: 'Server 2',  url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?autoplay=true`,                    quality: '1080p', isHLS: false });
  if (tmdbId) sources.push({ provider: 'videasy',      label: 'Server 3',  url: `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`,                          quality: '4K',    isHLS: false });
  if (tmdbId) sources.push({ provider: 'vidsrc.sbs',   label: 'Server 4',  url: `https://vidsrc.sbs/embed/tv/${tmdbId}/${season}/${episode}`,                           quality: '1080p', isHLS: false });
  if (tmdbId) sources.push({ provider: 'vidsrc.mov',   label: 'Server 5',  url: `https://vidsrc.mov/embed/tv/${tmdbId}/${season}/${episode}`,                           quality: '1080p', isHLS: false });
  // ── Tier 2 ──
  if (imdbId) sources.push({ provider: 'vidfast',      label: 'Server 6',  url: `https://vidfast.pro/tv/${imdbId}/${season}/${episode}`,                                quality: '4K',    isHLS: false });
  if (tmdbId) sources.push({ provider: 'multiembed',   label: 'Server 7',  url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,            quality: 'HLS',   isHLS: true  });
  if (tmdbId) sources.push({ provider: 'autoembed',    label: 'Server 8',  url: `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`,                   quality: '1080p', isHLS: false });
  if (tmdbId) sources.push({ provider: '2embed',       label: 'Server 9',  url: `https://www.2embed.stream/embed/tv/${tmdbId}/${season}/${episode}`,                    quality: '1080p', isHLS: false });
  if (tmdbId) sources.push({ provider: 'embed.su',     label: 'Server 10', url: `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`,                             quality: '1080p', isHLS: false });
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
