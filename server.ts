import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import type {
  AnalysisEvent,
  StoreDepartment,
  WorkerFormInput,
  WorkerRecord,
} from './src/types/vision';
import { validateWorkerInput } from './src/utils/analytics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'paarv_store.json');

interface StoreState {
  workers: WorkerRecord[];
  events: AnalysisEvent[];
}

const DEFAULT_WORKERS: WorkerRecord[] = [
  {
    id: 'wrk-001',
    name: 'Lakshana',
    role: 'Hacker',
    department: 'Store Management',
    badgeCode: 'EMP-001',
    uniformCue: 'Technical Operations & System Architecture Lead',
    status: 'active',
    enrolledAt: '2026-10-09T12:05:00.000Z',
  },
  {
    id: 'wrk-004',
    name: 'Tejas',
    role: 'Visionary',
    department: 'Store Management',
    badgeCode: 'EMP-004',
    uniformCue: 'Store Manager & Strategic Operations Lead',
    status: 'active',
    enrolledAt: '2026-10-14T12:55:00.000Z',
  },
  {
    id: 'wrk-002',
    name: 'Shirley',
    role: 'Hustler',
    department: 'Checkout & Service',
    badgeCode: 'EMP-002',
    uniformCue: 'Sales, Customer Engagement & POS Lead',
    status: 'active',
    enrolledAt: '2026-10-14T12:37:00.000Z',
  },
  {
    id: 'wrk-003',
    name: 'Mehaa',
    role: 'Hacker',
    department: 'Floor Operations',
    badgeCode: 'EMP-003',
    uniformCue: 'Inventory, Tech Support & Visual Merchandising',
    status: 'active',
    enrolledAt: '2026-10-14T12:49:00.000Z',
  },
  {
    id: 'wrk-005',
    name: 'Rithika',
    role: 'Hustler',
    department: 'Floor Operations',
    badgeCode: 'EMP-005',
    uniformCue: 'Beauty Advisor & Sales Specialist',
    status: 'active',
    enrolledAt: '2026-10-14T14:30:00.000Z',
  },
];

let storeLock: Promise<void> = Promise.resolve();
let memoryStore: StoreState | null = null;
let saveTimer: NodeJS.Timeout | null = null;

async function ensureStore(): Promise<StoreState> {
  if (memoryStore) return memoryStore;
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    memoryStore = {
      workers: Array.isArray(parsed.workers) && parsed.workers.length > 0 ? parsed.workers : DEFAULT_WORKERS,
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
    return memoryStore;
  } catch {
    const initial: StoreState = {
      workers: DEFAULT_WORKERS,
      events: [],
    };
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    memoryStore = initial;
    return initial;
  }
}

function scheduleStoreSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    if (memoryStore) {
      try {
        const tmpPath = `${STORE_PATH}.tmp`;
        await fs.writeFile(tmpPath, JSON.stringify(memoryStore, null, 2), 'utf8');
        await fs.rename(tmpPath, STORE_PATH);
      } catch (err) {
        console.error('Failed to persist store:', err);
      }
    }
  }, 1500);
}

async function withStoreWrite<T>(updater: (state: StoreState) => T | Promise<T>): Promise<T> {
  const prev = storeLock;
  let release!: () => void;
  storeLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    const state = await ensureStore();
    const result = await updater(state);
    const tmpPath = `${STORE_PATH}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    await fs.rename(tmpPath, STORE_PATH);
    return result;
  } finally {
    release();
  }
}

async function startServer() {
  await ensureStore();

  const app = express();
  app.use(express.json({ limit: '16mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      visionConfigured: true,
      modelEngine: 'Store Intelligence YOLO26 & Face Recognition Engine',
    });
  });

  app.get('/api/workers', async (_req, res) => {
    const store = await ensureStore();
    res.json({ workers: store.workers });
  });

  app.post('/api/workers', async (req, res) => {
    const body = req.body as Partial<WorkerFormInput>;
    const input: WorkerFormInput = {
      name: String(body.name ?? '').trim(),
      role: String(body.role ?? '').trim(),
      department: (body.department as StoreDepartment) || 'Floor Operations',
      badgeCode: String(body.badgeCode ?? '').trim().toUpperCase(),
      uniformCue: String(body.uniformCue ?? '').trim(),
      status: body.status === 'off_shift' ? 'off_shift' : 'active',
    };

    const validation = validateWorkerInput(input);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid worker details.', fieldErrors: validation.errors });
    }

    try {
      const created = await withStoreWrite((state) => {
        const duplicateBadge = state.workers.some(
          (w) => w.badgeCode.toUpperCase() === input.badgeCode.toUpperCase(),
        );
        if (duplicateBadge) {
          throw new Error('DUPLICATE_BADGE');
        }
        const record: WorkerRecord = {
          id: `wrk-${Date.now().toString(36)}`,
          ...input,
          enrolledAt: new Date().toISOString(),
        };
        state.workers.unshift(record);
        return record;
      });
      return res.status(201).json({ worker: created });
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_BADGE') {
        return res.status(409).json({
          error: `Badge ID ${input.badgeCode} is already registered to another employee.`,
        });
      }
      return res.status(500).json({ error: 'Failed to save registered worker.' });
    }
  });

  app.patch('/api/workers/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<WorkerFormInput>;
    const input: WorkerFormInput = {
      name: String(body.name ?? '').trim(),
      role: String(body.role ?? '').trim(),
      department: (body.department as StoreDepartment) || 'Floor Operations',
      badgeCode: String(body.badgeCode ?? '').trim().toUpperCase(),
      uniformCue: String(body.uniformCue ?? '').trim(),
      status: body.status === 'off_shift' ? 'off_shift' : 'active',
    };

    const validation = validateWorkerInput(input);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid worker details.', fieldErrors: validation.errors });
    }

    try {
      const updated = await withStoreWrite((state) => {
        const idx = state.workers.findIndex((w) => w.id === id);
        if (idx === -1) return null;
        const duplicateBadge = state.workers.some(
          (w) => w.id !== id && w.badgeCode.toUpperCase() === input.badgeCode.toUpperCase(),
        );
        if (duplicateBadge) {
          throw new Error('DUPLICATE_BADGE');
        }
        state.workers[idx] = {
          ...state.workers[idx],
          ...input,
        };
        return state.workers[idx];
      });
      if (!updated) {
        return res.status(404).json({ error: 'Registered worker not found.' });
      }
      return res.json({ worker: updated });
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_BADGE') {
        return res.status(409).json({
          error: `Badge ID ${input.badgeCode} is already assigned to another worker.`,
        });
      }
      return res.status(500).json({ error: 'Failed to update worker record.' });
    }
  });

  app.delete('/api/workers/:id', async (req, res) => {
    const { id } = req.params;
    const removed = await withStoreWrite((state) => {
      const idx = state.workers.findIndex((w) => w.id === id);
      if (idx === -1) return false;
      state.workers.splice(idx, 1);
      return true;
    });
    if (!removed) {
      return res.status(404).json({ error: 'Worker record not found.' });
    }
    return res.json({ deleted: true, id });
  });

  app.get('/api/events', async (_req, res) => {
    const store = await ensureStore();
    res.json({ events: store.events });
  });

  app.delete('/api/events', async (_req, res) => {
    await withStoreWrite((state) => {
      state.events = [];
    });
    res.json({ cleared: true });
  });

  // -------------------------------------------------------------------------
  // LIVE VISION ANALYSIS: Connects directly to Store Intelligence YOLO & Face Recognition
  // -------------------------------------------------------------------------
  app.post('/api/vision/analyze', async (req, res) => {
    const { imageBase64, mimeType, source } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      source?: 'webcam' | 'sample_frame' | 'uploaded_frame' | 'uploaded_video';
    };

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'A base64 image frame is required for analysis.' });
    }

    try {
      const fastApiUrl = 'http://127.0.0.1:8000/api/vision/analyze';
      const pyRes = await fetch(fastApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: mimeType || 'image/jpeg',
          source: source || 'webcam',
        }),
      });

      if (!pyRes.ok) {
        throw new Error(`Vision backend returned status ${pyRes.status}`);
      }

      const data = await pyRes.json();
      const event: AnalysisEvent = data.event;

      const store = await ensureStore();
      store.events.unshift(event);
      if (store.events.length > 100) {
        store.events = store.events.slice(0, 100);
      }
      scheduleStoreSave();

      return res.json({
        event,
        privacyGuarantee:
          data.privacyGuarantee ||
          'Frame discarded after inference. Zero customer facial biometrics or image frames were stored.',
      });
    } catch (err) {
      console.error('Vision analysis error:', err);
      return res.status(502).json({
        error: `Vision analysis request failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  app.use('/runs', express.static(path.resolve(__dirname, 'runs')));
  app.use('/sample_data', express.static(path.resolve(__dirname, 'sample_data')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`🚀 PaarvAI × Madello running on http://127.0.0.1:${port}`);
    console.log(`Connected to Store Intelligence YOLO & Face Recognition on http://127.0.0.1:8000`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
