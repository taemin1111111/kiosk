import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'kiosk-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const SALT_ROUNDS = 10;

export async function signup(req, res) {
  try {
    const { name, username, email, password } = req.body;

    if (!name?.trim() || !username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ ok: false, message: '모든 항목을 입력해주세요.' });
    }

    if (username.length > 30) {
      return res.status(400).json({ ok: false, message: '아이디는 30자 이내로 입력해주세요.' });
    }
    if (name.length > 50) {
      return res.status(400).json({ ok: false, message: '성함은 50자 이내로 입력해주세요.' });
    }
    if (email.length > 100) {
      return res.status(400).json({ ok: false, message: '이메일은 100자 이내로 입력해주세요.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.execute(
      `INSERT INTO members (username, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, 'USER')`,
      [username.trim(), name.trim(), email.trim(), passwordHash]
    );

    res.status(201).json({
      ok: true,
      message: '회원가입이 완료되었습니다.',
      memberId: result.insertId,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.sqlMessage?.includes('username')) {
        return res.status(409).json({ ok: false, message: '이미 사용 중인 아이디입니다.' });
      }
      if (err.sqlMessage?.includes('email')) {
        return res.status(409).json({ ok: false, message: '이미 사용 중인 이메일입니다.' });
      }
    }
    console.error('Signup error:', err);
    res.status(500).json({ ok: false, message: '회원가입 처리 중 오류가 발생했습니다.' });
  }
}

/** 아이디 찾기: 성함 + 이메일로 조회, 일치하면 username 반환 */
export async function findId(req, res) {
  try {
    const { name, email } = req.body;
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ ok: false, message: '성함과 메일 주소를 입력해주세요.' });
    }
    const [rows] = await pool.execute(
      'SELECT username FROM members WHERE name = ? AND email = ? LIMIT 1',
      [name.trim(), email.trim()]
    );
    if (rows.length === 0) {
      return res.json({ ok: false, message: '입력하신 정보로 가입된 계정을 찾을 수 없습니다.' });
    }
    res.json({ ok: true, username: rows[0].username });
  } catch (err) {
    console.error('FindId error:', err);
    res.status(500).json({ ok: false, message: '일시적인 오류가 발생했습니다.' });
  }
}

/** 비밀번호 찾기: 성함 + 아이디 + 이메일 일치 시 ok (추후 재설정 링크 메일 발송) */
export async function findPassword(req, res) {
  try {
    const { name, username, email } = req.body;
    if (!name?.trim() || !username?.trim() || !email?.trim()) {
      return res.status(400).json({ ok: false, message: '성함, 아이디, 메일 주소를 입력해주세요.' });
    }
    const [rows] = await pool.execute(
      'SELECT id FROM members WHERE name = ? AND username = ? AND email = ? LIMIT 1',
      [name.trim(), username.trim(), email.trim()]
    );
    if (rows.length === 0) {
      return res.json({ ok: false, message: '입력하신 정보로 가입된 계정을 찾을 수 없습니다.' });
    }
    // TODO: 비밀번호 재설정 링크 생성 후 등록 메일로 발송
    res.json({ ok: true, message: '입력하신 메일 주소로 비밀번호 재설정 링크가 발송되었습니다.' });
  } catch (err) {
    console.error('FindPassword error:', err);
    res.status(500).json({ ok: false, message: '일시적인 오류가 발생했습니다.' });
  }
}

/** 로그인: 아이디 = username 으로 DB 조회 후 비밀번호 bcrypt 비교. admin 요청 시 role ADMIN 만 허용 */
export async function login(req, res) {
  try {
    const { username, password, admin } = req.body;
    const idTrimmed = typeof username === 'string' ? username.trim() : '';
    if (!idTrimmed || !password) {
      return res.status(400).json({ ok: false, message: '아이디와 비밀번호를 입력해주세요.' });
    }
    const [rows] = await pool.execute(
      'SELECT id, password_hash, role FROM members WHERE username = ? LIMIT 1',
      [idTrimmed]
    );
    if (rows.length === 0) {
      return res.json({ ok: false, message: '아이디 또는 비밀번호가 맞지 않습니다.' });
    }
    const hash = rows[0].password_hash;
    if (!hash) {
      return res.json({ ok: false, message: '아이디 또는 비밀번호가 맞지 않습니다.' });
    }
    const match = await bcrypt.compare(String(password), hash);
    if (!match) {
      return res.json({ ok: false, message: '아이디 또는 비밀번호가 맞지 않습니다.' });
    }
    const role = (rows[0].role || 'USER').toString().toUpperCase();
    if (admin === true && role !== 'ADMIN') {
      return res.json({ ok: false, message: '아이디 또는 비밀번호가 맞지 않습니다.' });
    }
    const token = jwt.sign(
      { userId: rows[0].id, username: idTrimmed, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({ ok: true, token, role });
  } catch {
    res.status(500).json({ ok: false, message: '일시적인 오류가 발생했습니다.' });
  }
}

/** 비밀번호 변경: username + 새 비밀번호로 DB 업데이트 */
export async function changePassword(req, res) {
  try {
    const { username, password } = req.body;
    if (!username?.trim() || !password) {
      return res.status(400).json({ ok: false, message: '아이디와 비밀번호를 입력해주세요.' });
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.execute(
      'UPDATE members SET password_hash = ? WHERE username = ?',
      [passwordHash, username.trim()]
    );
    if (result.affectedRows === 0) {
      return res.json({ ok: false, message: '해당 회원을 찾을 수 없습니다.' });
    }
    res.json({ ok: true, message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    console.error('ChangePassword error:', err);
    res.status(500).json({ ok: false, message: '일시적인 오류가 발생했습니다.' });
  }
}
