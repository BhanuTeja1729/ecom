import './config/env';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { connectDB } from './config/db';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/error';

// Routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import reviewRoutes from './routes/review.routes';
import userRoutes from './routes/user.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

app.use('/api/', limiter);
app.use('/api/v1/auth', authLimiter);

// ─── Parsers ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Sanitization ───────────────────────────────────────────────────────────
app.use(mongoSanitize());

// ─── Logging ────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API Routes ─────────────────────────────────────────────────────────────
const BASE = '/api/v1';
app.use(`${BASE}/auth`, authRoutes);
app.use(`${BASE}/products`, productRoutes);
app.use(`${BASE}/products/:productId/reviews`, reviewRoutes);
app.use(`${BASE}/categories`, categoryRoutes);
app.use(`${BASE}/cart`, cartRoutes);
app.use(`${BASE}/orders`, orderRoutes);
app.use(`${BASE}/users`, userRoutes);
app.use(`${BASE}/payment`, paymentRoutes);

// ─── Serve Frontend (production) ────────────────────────────────────────────
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback — serve index.html for any non-API route
app.get(/^(?!\/api).*/, (_, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ─── 404 & Error Handler (API only) ─────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDB();
    const port = parseInt(env.PORT, 10);
    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port} [${env.NODE_ENV}]`);
      console.log(`📡 API base: http://localhost:${port}${BASE}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;
