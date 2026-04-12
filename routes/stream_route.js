/**
 * server/routes/stream.js
 * Extracts real .m3u8 stream URLs using vidsrc.ts
 * GET /api/stream/movie/:tmdbId
 * GET /api/stream/tv/:tmdbId/:season/:episode
 */

const express = require('express');
const router  = express.Router();

let tmdbScrape = null;

// Lazy load vidsrc.ts (ESM module)
async function getScraper() {
  if (!tmdbScrape) {
    try {
      const mod  = await import('vidsrc.ts');
      tmdbScrape = mod.tmdbScrape || mod.default;
    } catch (e) {
      console.error('vidsrc.ts load error:', e.message);
    }
  }
  return tmdbScrape;
}

// GET /api/stream/movie/:tmdbId
router.get('/movie/:tmdbId', async (req, res) => {
  try {
    const scraper = await getScraper();
    if (!scraper) return res.status(503).json({ message: 'Stream extractor unavailable' });

    const { tmdbId } = req.params;
    console.log(`🎬 Extracting stream for movie TMDB:${tmdbId}`);

    const result = await scraper(tmdbId, 'movie');

    if (!result || !result.length) {
      return res.status(404).json({ message: 'No streams found' });
    }

    // Return all found streams
    const streams = result.map(s => ({
      url:      s.url  || s.stream_url || s.link,
      provider: s.source || s.provider || 'vidsrc',
      quality:  s.quality || 'auto',
      isHLS:    true,
    })).filter(s => s.url);

    res.json({ streams, tmdbId });
  } catch (err) {
    console.error('Stream extraction error:', err.message);
    res.status(500).json({ message: 'Failed to extract stream', error: err.message });
  }
});

// GET /api/stream/tv/:tmdbId/:season/:episode
router.get('/tv/:tmdbId/:season/:episode', async (req, res) => {
  try {
    const scraper = await getScraper();
    if (!scraper) return res.status(503).json({ message: 'Stream extractor unavailable' });

    const { tmdbId, season, episode } = req.params;
    console.log(`📺 Extracting stream for TV TMDB:${tmdbId} S${season}E${episode}`);

    const result = await scraper(tmdbId, 'tv', parseInt(season), parseInt(episode));

    if (!result || !result.length) {
      return res.status(404).json({ message: 'No streams found' });
    }

    const streams = result.map(s => ({
      url:      s.url  || s.stream_url || s.link,
      provider: s.source || s.provider || 'vidsrc',
      quality:  s.quality || 'auto',
      isHLS:    true,
    })).filter(s => s.url);

    res.json({ streams, tmdbId, season, episode });
  } catch (err) {
    console.error('Stream extraction error:', err.message);
    res.status(500).json({ message: 'Failed to extract stream', error: err.message });
  }
});

module.exports = router;
