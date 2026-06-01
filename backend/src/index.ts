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
import deliveryRoutes from './routes/delivery.routes';
import mediaRoutes from './routes/media.routes';
import couponRoutes from './routes/coupon.routes';

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

const allowedOrigins = [
  env.FRONTEND_URL,
  'https://blipzo-rp5n.onrender.com',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
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
  max: 50,
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
app.use(`${BASE}/delivery`, deliveryRoutes);
app.use(`${BASE}/media`, mediaRoutes);
app.use(`${BASE}/coupons`, couponRoutes);

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

    // Run payout migration on server start/hot-reload
    try {
      const { Order } = await import('./models/Order');
      const { getSettingValue } = await import('./models/Setting');
      const rate = await getSettingValue('deliveryRatePerKm', 15);
      console.log(`[Migration] Active delivery payout rate: ₹${rate}/km`);
      const orders = await Order.find({});
      let updatedCount = 0;
      for (const order of orders) {
        let changed = false;
        if (order.deliveryDistanceKm === undefined || order.deliveryDistanceKm === null) {
          order.deliveryDistanceKm = 5.0;
          changed = true;
        }
        const expectedPayout = Math.round((order.deliveryDistanceKm * rate) * 100) / 100;
        if (order.deliveryPayout === undefined || order.deliveryPayout === null || order.deliveryPayout !== expectedPayout) {
          order.deliveryPayout = expectedPayout;
          changed = true;
        }
        if (changed) {
          await order.save();
          updatedCount++;
        }
      }
      console.log(`[Migration] Successfully updated ${updatedCount} orders.`);
    } catch (migErr) {
      console.error('[Migration] Failed:', migErr);
    }

    // Run SKU format migration on server start/hot-reload
    try {
      const { Category } = await import('./models/Category');
      const { Product } = await import('./models/Product');
      
      console.log('[Migration] Running SKU migration...');
      
      const categories = await Category.find({});
      const existingPrefixes = new Set<string>();
      
      // Reset prefixes to avoid duplicates during regeneration
      for (const cat of categories) {
        cat.skuPrefix = undefined;
        await cat.save();
      }

      const generateCategoryPrefix = (categoryName: string, existing: Set<string>): string => {
        const clean = categoryName.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (clean.length >= 3) {
          const first3 = clean.substring(0, 3);
          if (!existing.has(first3)) return first3;
        }
        const words = categoryName.split(/[\s,&]+/).filter(w => w.length > 0);
        if (words.length >= 3) {
          const initials = words.map(w => w[0].toUpperCase()).join('').replace(/[^A-Z]/g, '');
          if (initials.length >= 3) {
            const init3 = initials.substring(0, 3);
            if (!existing.has(init3)) return init3;
          }
        }
        if (clean.length >= 3) {
          for (let i = 0; i < clean.length - 2; i++) {
            for (let j = i + 1; j < clean.length - 1; j++) {
              for (let k = j + 1; k < clean.length; k++) {
                const candidate = clean[i] + clean[j] + clean[k];
                if (!existing.has(candidate)) return candidate;
              }
            }
          }
        }
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (const a of alphabet) {
          for (const b of alphabet) {
            for (const c of alphabet) {
              const candidate = a + b + c;
              if (!existing.has(candidate)) return candidate;
            }
          }
        }
        return 'GEN';
      };

      for (const cat of categories) {
        const prefix = generateCategoryPrefix(cat.name, existingPrefixes);
        existingPrefixes.add(prefix);
        cat.skuPrefix = prefix;
        await cat.save();
      }
      console.log(`[Migration] Category prefixes updated. Total prefixes: ${existingPrefixes.size}`);

      const products = await Product.find({});
      // Clear product SKUs
      for (const prod of products) {
        (prod as any).sku = undefined;
        await prod.save();
      }

      // Re-save products to trigger the pre-save hook
      for (const prod of products) {
        await prod.save();
      }
      console.log(`[Migration] SKU Migration completed. ${products.length} products updated.`);
    } catch (migErr) {
      console.error('[Migration] SKU Migration failed:', migErr);
    }

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
