import express from 'express';
import { getAppCategories, getAppMenus, getAppMenuDetail, getAppPrivacyPolicy, getAppServiceTerms } from '../controllers/appController.js';
import { auth } from '../middleware/auth.js';
import { getAppActiveCart, postAppAddCartItem, deleteAppClearActiveCart, patchAppUpdateCartItemQty, deleteAppRemoveCartItem } from '../controllers/cartController.js';
import { postAppCheckout, getAppOrders } from '../controllers/orderController.js';

const router = express.Router();

router.get('/categories', getAppCategories);
router.get('/menus', getAppMenus);
router.get('/menus/:id', getAppMenuDetail);

// 약관/정책 (최신 1건)
router.get('/service-terms', getAppServiceTerms);
router.get('/privacy-policy', getAppPrivacyPolicy);

// 장바구니(로그인 필요)
router.get('/carts/active', auth, getAppActiveCart);
router.post('/carts/active/items', auth, postAppAddCartItem);
router.delete('/carts/active/items', auth, deleteAppClearActiveCart);
router.patch('/carts/active/items/:id', auth, patchAppUpdateCartItemQty);
router.delete('/carts/active/items/:id', auth, deleteAppRemoveCartItem);

// 결제하기
router.post('/checkout', auth, postAppCheckout);
// 주문내역
router.get('/orders', auth, getAppOrders);

export { router as appRouter };

