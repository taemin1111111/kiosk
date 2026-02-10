import express from 'express';
import { signup, findId, findPassword, changePassword, login } from '../controllers/membersController.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/find-id', findId);
router.post('/find-password', findPassword);
router.post('/change-password', changePassword);
router.post('/login', login);

export { router as membersRouter };
