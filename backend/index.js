const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const socketHandler = require('./sockets/socketHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const qrRoutes = require('./routes/qrRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

dotenv.config();

// Connect to Databases
connectRedis();
connectDB();

const allowedOrigins = [
  "https://qrbit-frontend.vercel.app",
  process.env.FRONTEND_URI
].filter(Boolean);

const vercelPreviewRegex = /^https:\/\/qrbit-frontend-.*\.vercel\.app$/;

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin) || vercelPreviewRegex.test(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  pingTimeout: 1000, 
  pingInterval: 5000,
  maxHttpBufferSize: 1e6,
  allowEIO3: false,
  connectionStateRecovery: false,
  reconnection: false 
});

// Attach io to app for use in controllers
app.set('io', io);

// Middleware
app.use(cors({ 
  origin: corsOrigin, 
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'] 
}));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api', qrRoutes);
app.use('/api', attendanceRoutes);

// Socket Logic
socketHandler(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

server.listen(process.env.PORT, '0.0.0.0', () => console.log(`Server running on port ${process.env.PORT}`));