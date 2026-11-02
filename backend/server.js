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

// Standard CORS middleware first so preflight and rate-limit responses always carry CORS headers
app.use(cors());

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
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

module.exports = app;
