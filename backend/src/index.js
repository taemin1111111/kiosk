import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { healthRouter } from './routes/health.js';
import { membersRouter } from './routes/members.js';
import { boRouter } from './routes/bo.js';
import { appRouter } from './routes/app.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

// uploads 폴더 정적 서빙 (상품사진 업로드용)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.use('/api/health', healthRouter);
app.use('/api/members', membersRouter);
app.use('/api/bo', boRouter);
app.use('/api/app', appRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
