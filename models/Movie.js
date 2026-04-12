/**
 * Movie Model
 * Defines the schema for movies in the database.
 * streamUrl points to external streaming service (HLS/MP4).
 */

const mongoose = require('mongoose');

const streamSourceSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['streamtape', 'vidstream', 'mp4upload', 'doodstream', 'mixdrop', 'filemoon', 'upcloud', 'archive', 'direct'],
    default: 'direct',
  },
  quality: {
    type: String,
    enum: ['360p', '480p', '720p', '1080p', '4K', 'auto'],
    default: 'auto',
  },
  url: { type: String, required: true },
  isHLS: { type: Boolean, default: false }, // true = .m3u8 playlist, false = direct MP4
});

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    genre: [{ type: String, required: true }],
    year: { type: Number, required: true },
    rating: { type: Number, min: 0, max: 10, default: 0 },
    poster: { type: String, default: '' },       // URL or local path to poster image
    backdrop: { type: String, default: '' },     // Wide background image for featured section
    duration: { type: Number, default: 0 },      // Duration in minutes
    director: { type: String, default: '' },
    cast: [{ type: String }],
    language: { type: String, default: 'English' },
    country: { type: String, default: 'USA' },

    // Primary stream URL (kept for backward compatibility)
    streamUrl: { type: String, default: '' },

    // Multiple stream sources with quality options
    streamSources: [streamSourceSchema],

    // Metadata
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Text search index for title and description
movieSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Movie', movieSchema);
