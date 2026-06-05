import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { testConnection, migrate } from './db';
import { runSeed } from './db/seed';
import routes from './routes';
import { errorHandler, notFound } from './utils/response';

const app = express();
const PORT = parseInt(process.env.PORT || '4000');

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Health ───────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    app: 'Ikonex Academy SMS',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── 404 / Error ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────
async function start() {
  const connected = await testConnection();
  if (!connected && process.env.NODE_ENV !== 'test') {
    console.error('❌ Cannot start without database. Check your .env');
    process.exit(1);
  }

  try { await migrate(); } catch (e) { console.warn('⚠️  Migrate warning (schema may already exist):', (e as Error).message); }
  await runSeed();

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     IKONEX ACADEMY SMS API             ║
║     Running on http://localhost:${PORT}  ║
╚════════════════════════════════════════╝
    `);
  });
}

start();

export default app;
