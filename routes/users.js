/**
 * User Routes
 * Watch history, favorites, and profile management.
 */

const express = require('express');
const User = require('../models/User');
const Movie = require('../models/Movie');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/favorites
router.get('/favorites', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    res.json(user.favorites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/favorites/:movieId — toggle favorite
router.post('/favorites/:movieId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const movieId = req.params.movieId;

    const idx = user.favorites.indexOf(movieId);
    if (idx === -1) {
      user.favorites.push(movieId);
    } else {
      user.favorites.splice(idx, 1);
    }

    await user.save();
    res.json({ favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/history
router.get('/history', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('watchHistory.movie')
      .select('watchHistory');
    res.json(user.watchHistory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/history/:movieId — record watch
router.post('/history/:movieId', protect, async (req, res) => {
  try {
    const { progress } = req.body;
    const user = await User.findById(req.user._id);

    // Update existing entry or add new one
    const existing = user.watchHistory.find(
      (h) => h.movie?.toString() === req.params.movieId
    );
    if (existing) {
      existing.progress = progress || 0;
      existing.watchedAt = new Date();
    } else {
      user.watchHistory.unshift({
        movie: req.params.movieId,
        progress: progress || 0,
      });
      // Keep only last 50 entries
      if (user.watchHistory.length > 50) {
        user.watchHistory = user.watchHistory.slice(0, 50);
      }
    }

    await user.save();
    res.json({ message: 'History updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
