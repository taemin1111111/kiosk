import express from 'express';
import { getAppCategories, getAppMenus, getAppMenuDetail } from '../controllers/appController.js';
import { auth } from '../middleware/auth.js';
import { getAppActiveCart, postAppAddCartItem, deleteAppClearActiveCart, patchAppUpdateCartItemQty, deleteAppRemoveCartItem } from '../controllers/cartController.js';

const router = express.Router();

router.get('/categories', getAppCategories);
router.get('/menus', getAppMenus);
router.get('/menus/:id', getAppMenuDetail);

// 장바구니(로그인 필요)
router.get('/carts/active', auth, getAppActiveCart);
router.post('/carts/active/items', auth, postAppAddCartItem);
router.delete('/carts/active/items', auth, deleteAppClearActiveCart);
router.patch('/carts/active/items/:id', auth, patchAppUpdateCartItemQty);
router.delete('/carts/active/items/:id', auth, deleteAppRemoveCartItem);

export { router as appRouter };

