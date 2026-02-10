import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kiosk-dev-secret';

/**
 * JWT 검증 미들웨어. Authorization: Bearer <token> 이 있으면 검증 후 req.user 에 { userId, username } 설정.
 * 인증 필요 라우트에 사용 (예: app.use('/api/members/me', auth, meHandler)).
 */
export function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { userId: payload.userId, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ ok: false, message: '로그인이 만료되었습니다.' });
  }
}
