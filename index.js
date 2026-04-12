/**
 * CineStream / RoyalQueen - Main Server Entry Point
 * Express + MongoDB + Socket.io for Watch Party
 */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const path       = require('path');
const http       = require('http');
const { Server } = require('socket.io');

const movieRoutes     = require('./routes/movies');
const userRoutes      = require('./routes/users');
const authRoutes      = require('./routes/auth');
const adminRoutes     = require('./routes/admin');
const scraperRoutes   = require('./routes/scraper');
const tvRoutes        = require('./routes/tv');
const tvScraperRoutes = require('./routes/tv-scraper');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// rooms[roomId] = { movieId, playing, currentTime, hostId, members: [{id, username}] }
const rooms = {};

io.on('connection', (socket) => {

  socket.on('join-room', ({ roomId, movieId, username }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = { movieId, playing: false, currentTime: 0, hostId: socket.id, members: [] };
    }

    const room = rooms[roomId];
    room.members = room.members.filter(m => m.id !== socket.id);
    room.members.push({ id: socket.id, username: username || 'Guest' });

    // Send current state to new joiner
    socket.emit('room-state', {
      playing:     room.playing,
      currentTime: room.currentTime,
      hostId:      room.hostId,
      members:     room.members,
      movieId:     room.movieId,
      myId:        socket.id,
    });

    // Tell everyone else someone joined
    socket.to(roomId).emit('member-joined', { username: username || 'Guest', members: room.members });
  });

  socket.on('play', ({ roomId, currentTime }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].playing     = true;
    rooms[roomId].currentTime = currentTime;
    socket.to(roomId).emit('play', { currentTime });
  });

  socket.on('pause', ({ roomId, currentTime }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].playing     = false;
    rooms[roomId].currentTime = currentTime;
    socket.to(roomId).emit('pause', { currentTime });
  });

  socket.on('seek', ({ roomId, currentTime }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].currentTime = currentTime;
    socket.to(roomId).emit('seek', { currentTime });
  });

  socket.on('time-sync', ({ roomId, currentTime }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].currentTime = currentTime;
    socket.to(roomId).emit('time-sync', { currentTime });
  });

  socket.on('chat-message', ({ roomId, username, message }) => {
    const msg = { id: Date.now(), username: username || 'Guest', message, timestamp: new Date().toISOString() };
    io.to(roomId).emit('chat-message', msg);
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      const room = rooms[roomId];
      if (!room) continue;
      room.members = room.members.filter(m => m.id !== socket.id);
      if (room.hostId === socket.id && room.members.length > 0) {
        room.hostId = room.members[0].id;
        io.to(roomId).emit('host-changed', { hostId: room.hostId, members: room.members });
      }
      io.to(roomId).emit('member-left', { members: room.members });
      if (room.members.length === 0) delete rooms[roomId];
    }
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    const allowed = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'https://cinestream-eta-gold.vercel.app',
      'capacitor://localhost',
      'http://localhost',
      'ionic://localhost',
    ];
    if (allowed.some(a => origin.startsWith(a)) || origin.includes('vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now during development
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/movies',     movieRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/scraper',    scraperRoutes);
app.use('/api/tv',         tvRoutes);
app.use('/api/tv-scraper', tvScraperRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RoyalQueen API running', rooms: Object.keys(rooms).length });
});

app.get('/api/setup-admin', async (req, res) => {
  try {
    const { secret } = req.query;
    if (secret !== 'cinestream_setup_2024') return res.status(403).json({ message: 'Invalid secret' });
    const bcrypt      = require('bcryptjs');
    const User        = require('./models/User');
    const newEmail    = process.env.ADMIN_EMAIL    || 'royalqueen@cinestream.com';
    const newPassword = process.env.ADMIN_PASSWORD || 'TrueQueen@SheIsTheOne01';
    const hash        = await bcrypt.hash(newPassword, 10);
    const result      = await User.updateOne({ role: 'admin' }, { email: newEmail, password: hash, username: newEmail.split('@')[0] });
    if (result.matchedCount === 0) {
      await User.create({ username: newEmail.split('@')[0], email: newEmail, password: hash, role: 'admin' });
      return res.json({ message: '✅ Admin created!', email: newEmail });
    }
    res.json({ message: '✅ Admin updated!', email: newEmail });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Start ────────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cinestream')
  .then(() => {
    console.log('✅ MongoDB connected');
    // KEY FIX: use server.listen not app.listen so Socket.io works
    server.listen(PORT, () => {
      console.log(`🚀 RoyalQueen API + Socket.io on http://localhost:${PORT}`);
    });
  })
  .catch((err) => { console.error('❌ MongoDB failed:', err.message); process.exit(1); });

module.exports = app;
