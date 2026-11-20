require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const app = require('./app');
const connectDatabase = require('./config/db');

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a private value of at least 32 characters');
  }
  await connectDatabase();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' } });
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (error) { next(new Error('Invalid socket authentication')); }
  });
  io.on('connection', socket => {
    socket.join(`user:${socket.user.sub}`);
    if (socket.user.role === 'admin') socket.join('admins');
  });
  app.set('io', io);
  const port = process.env.PORT || 5000;
  server.listen(port, () => console.log(`AquaShield API listening at http://localhost:${port}`));
}

if (require.main === module) start().catch(error => { console.error('Server startup failed', error); process.exit(1); });
module.exports = start;
