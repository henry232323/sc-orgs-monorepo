import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import session from 'express-session';
import authRoutes from './routes/auth_routes';
import organizationRoutes from './routes/organization_routes';
import eventRoutes from './routes/event_routes';
import commentRoutes from './routes/comment_routes';
import roleRoutes from './routes/role_routes';
import notificationRoutes from './routes/notification_routes';
import userRoutes from './routes/user_routes';
import discordRoutes from './routes/discord_routes';
import reputationRoutes from './routes/reputation_routes';
import openapiRoutes from './routes/openapi_routes';
import logger from './config/logger';
import { authenticateJWT } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { TaskScheduler } from './services/task_scheduler';
import { DiscordCommandService } from './services/discord_command_service';

// Load environment variables from the backend directory
const backendRoot = path.resolve(__dirname, '../');
const envPath = path.join(backendRoot, '.env');
dotenv.config({ path: envPath });
logger.info(`Loading environment from: ${envPath}`);
logger.info(`Backend root: ${backendRoot}`);
logger.info(
  `DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID ? 'SET' : 'NOT SET'}`
);

// Import passport after environment variables are loaded
import { initializePassport } from './config/passport';
import passport from './config/passport';

const app: express.Application = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (for Nginx reverse proxy)
// This tells Express to trust the first proxy (Nginx) and use X-Forwarded-* headers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    hasAuth: !!req.headers.authorization,
  });
  next();
});

// Session middleware (must come before passport.initialize)
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});
app.use(sessionMiddleware as any);

// Raw body parsing for Discord webhook signature validation
app.use('/api/discord/webhook', express.raw({ type: 'application/json', limit: '10mb' }));

// Body parsing middleware for other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize passport configuration after environment variables are loaded
try {
  initializePassport();
  logger.info('✅ Passport initialized successfully');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error(`❌ Failed to initialize Passport: ${errorMessage}`);
}

// Initialize passport middleware (must come after session)
app.use(passport.initialize() as any);
app.use(passport.session() as any);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
// app.use('/api/', limiter);

// Basic health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Apply optional JWT authentication to all API routes
// This sets req.user if a valid JWT is present, but doesn't fail if one isn't
app.use('/api', authenticateJWT);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api', discordRoutes);
app.use('/api/openapi', openapiRoutes);

app.get('/api', (_req, res) => {
  res.json({
    message: 'SC-Orgs API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      organizations: '/api/organizations',
      events: '/api/events',
      comments: '/api/comments',
      roles: '/api/roles',
      notifications: '/api/notifications',
      discord: '/api/discord',
      openapi: '/api/openapi',
      health: '/health',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize task scheduler
let taskScheduler: TaskScheduler;
try {
  taskScheduler = new TaskScheduler();
  taskScheduler.startAllTasks();

  // Store globally for access from other modules
  (global as any).taskScheduler = taskScheduler;

  logger.info('Task scheduler initialized and started');
} catch (error) {
  logger.error('Failed to initialize task scheduler:', error);
}

// Initialize Discord command service
let discordCommandService: DiscordCommandService;
try {
  discordCommandService = new DiscordCommandService();
  
  // Register slash commands on startup
  discordCommandService.registerSlashCommands().catch((error) => {
    logger.error('Failed to register Discord slash commands on startup:', error);
  });

  // Store globally for access from other modules
  (global as any).discordCommandService = discordCommandService;

  logger.info('Discord command service initialized');
} catch (error) {
  logger.error('Failed to initialize Discord command service:', error);
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SC-Orgs Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
  console.log(`🔐 Auth endpoint: http://localhost:${PORT}/api/auth`);
  console.log(
    `🏢 Organizations endpoint: http://localhost:${PORT}/api/organizations`
  );
  console.log(`📅 Events endpoint: http://localhost:${PORT}/api/events`);
  console.log(`💬 Comments endpoint: http://localhost:${PORT}/api/comments`);
  console.log(`👥 Roles endpoint: http://localhost:${PORT}/api/roles`);
  console.log(
    `🔔 Notifications endpoint: http://localhost:${PORT}/api/notifications`
  );
  console.log(`🤖 Discord endpoint: http://localhost:${PORT}/api/discord`);
  console.log(`📚 OpenAPI endpoint: http://localhost:${PORT}/api/openapi/spec`);
  console.log(`📖 OpenAPI UI: http://localhost:${PORT}/api/openapi/ui`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'NOT SET'}`);
  console.log(
    `⏰ Task scheduler: ${taskScheduler ? 'Active' : 'Failed to initialize'}`
  );
  console.log(
    `🤖 Discord commands: ${discordCommandService ? 'Active' : 'Failed to initialize'}`
  );
});

export default app;
