/**
 * TVShow Model
 * Stores TV show metadata + seasons + episodes
 */

const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
  episodeNumber: { type: Number, required: true },
  title:         { type: String, default: '' },
  overview:      { type: String, default: '' },
  airDate:       { type: String, default: '' },
  runtime:       { type: Number, default: 0 },
  stillImage:    { type: String, default: '' }, // episode thumbnail
  streamSources: [{
    provider: { type: String, default: 'direct' },
    label:    { type: String, default: 'Server 1' },
    url:      { type: String, required: true },
    quality:  { type: String, default: 'auto' },
    isHLS:    { type: Boolean, default: false },
  }],
});

const seasonSchema = new mongoose.Schema({
  seasonNumber:  { type: Number, required: true },
  title:         { type: String, default: '' },
  overview:      { type: String, default: '' },
  poster:        { type: String, default: '' },
  airDate:       { type: String, default: '' },
  episodeCount:  { type: Number, default: 0 },
  episodes:      [episodeSchema],
});

const tvShowSchema = new mongoose.Schema({
  tmdbId:      { type: Number, default: null },
  imdbId:      { type: String, default: '' },
  title:       { type: String, required: true, trim: true, index: true },
  description: { type: String, default: '' },
  genre:       [{ type: String }],
  year:        { type: Number, default: 0 },
  endYear:     { type: Number, default: 0 },
  rating:      { type: Number, min: 0, max: 10, default: 0 },
  poster:      { type: String, default: '' },
  backdrop:    { type: String, default: '' },
  status:      { type: String, default: 'Ended' }, // Returning Series / Ended / Canceled
  network:     { type: String, default: '' },
  language:    { type: String, default: 'English' },
  director:    { type: String, default: '' },
  cast:        [{ type: String }],
  totalSeasons:{ type: Number, default: 0 },
  seasons:     [seasonSchema],
  isFeatured:  { type: Boolean, default: false },
  isTrending:  { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  views:       { type: Number, default: 0 },
}, { timestamps: true });

tvShowSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('TVShow', tvShowSchema);
