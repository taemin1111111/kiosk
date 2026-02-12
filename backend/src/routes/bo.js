import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { auth } from '../middleware/auth.js';
import { getCategories, getOptionGroups, getOptionItems, getNutritionCategories, getUsers, getServiceTerms, createServiceTerms, getPrivacyPolicy, createPrivacyPolicy, getMenus, getMenuDetail, updateMenu, updateMenuBest, updateMenuOptionGroups, createMenu, uploadMenuImage } from '../controllers/boController.js';
import { getBoOrders, getBoOrderDetail, patchBoOrderConfirm, patchBoOrderCancel } from '../controllers/orderController.js';

const router = express.Router();

router.use(auth);

// ===== 파일 업로드 (상품사진) =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads'); // backend/uploads
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext) ? ext : '.png';
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
  },
});

function uploadSingleFile(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();
      const message = err.code === 'LIMIT_FILE_SIZE' ? '이미지 파일은 25MB 이하만 업로드할 수 있습니다.' : err.message;
      return res.status(400).json({ ok: false, message });
    });
  };
}

router.get('/categories', getCategories);
router.get('/users', getUsers);
router.get('/service-terms', getServiceTerms);
router.post('/service-terms', createServiceTerms);
router.get('/privacy-policy', getPrivacyPolicy);
router.post('/privacy-policy', createPrivacyPolicy);
router.get('/option-groups', getOptionGroups);
router.get('/option-groups/:id/items', getOptionItems);
router.get('/orders', getBoOrders);
router.get('/orders/:id', getBoOrderDetail);
router.patch('/orders/:id/confirm', patchBoOrderConfirm);
router.patch('/orders/:id/cancel', patchBoOrderCancel);
router.get('/nutrition-categories', getNutritionCategories);
router.get('/menus', getMenus);
router.get('/menus/:id', getMenuDetail);
router.patch('/menus/:id', updateMenu);
router.patch('/menus/:id/best', updateMenuBest);
router.patch('/menus/:id/option-groups', updateMenuOptionGroups);
router.post('/menus', createMenu);
router.post('/upload/menu-image', uploadSingleFile('file'), uploadMenuImage);

export { router as boRouter };
