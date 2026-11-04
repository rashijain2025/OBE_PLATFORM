require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const { initAdminFromEnv } = require('./utils/initAdmin');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Connect to MongoDB & initialize admin user from environment
connectDB().then(() => {
  if (process.env.NODE_ENV !== 'test') {
    initAdminFromEnv().catch((err) => console.error('[Admin Init Error]:', err.message));
  }
});

// Configure CORS: read origins from CORS_ORIGINS or FRONTEND_URL env
const isProduction = process.env.NODE_ENV === 'production';
const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
const configuredOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Fallback to localhost origins for local development when not configured
const allowedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (server-to-server, curl, health checks)
    if (!origin) return callback(null, true);

    // Strictly disallow wildcard in production
    if (!isProduction && allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development mode, allow localhost on any port
    if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin '${origin}' not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
};

app.use(cors(corsOptions));

// Security middleware
app.use(helmet());
app.use(mongoSanitize());

// Global rate limiter: 300 requests per 15 minutes per IP (skip CORS preflights)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { success: false, data: null, message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Rate limiter for auth login (skip preflight OPTIONS; relaxed in non-production)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 15 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { success: false, data: null, message: 'Too many login attempts, please try again after 15 minutes.' },
});

app.use(express.json({ limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth/login', loginLimiter); // Strict limiter on login
app.use('/api/auth/google', loginLimiter); // Strict limiter on google login
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/coordinators', require('./routes/coordinatorRoutes'));
app.use('/api/invitations', require('./routes/invitationRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/programmes', require('./routes/programmeRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/enrollments', require('./routes/enrollmentRoutes'));
app.use('/api/cos', require('./routes/outcomeRoutes'));
app.use('/api/assessments', require('./routes/assessmentRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/marks', require('./routes/markRoutes'));
app.use('/api/attainment', require('./routes/attainmentRoutes'));
app.use('/api/curriculum', require('./routes/curriculumRoutes'));
app.use('/api/mappings', require('./routes/mappingRoutes'));
app.use('/api/programme-attainment', require('./routes/programmeAttainmentRoutes'));
app.use('/api/ml', require('./routes/mlRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
  });
});

// Central error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0';
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`Backend running on ${HOST}:${PORT}`);
  });
}

module.exports = app;
