-- 결제 도메인: orders, order_items, order_item_options, payments
-- members.store_point_balance, toss_point_balance 는 이미 추가된 상태 가정
-- carts, cart_items, cart_item_options 는 기존 구조 가정

-- 5) orders (주문 마스터)
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(30) NOT NULL UNIQUE,
  member_id BIGINT NOT NULL,
  status ENUM('PENDING','PAID','CANCELLED','FAILED') DEFAULT 'PENDING',
  total_amount INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  eat_type ENUM('IN_STORE','TAKE_OUT') NOT NULL,
  store_point_used INT DEFAULT 0,
  toss_point_used INT DEFAULT 0,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_orders_member (member_id),
  INDEX idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) order_items (주문 상세 스냅샷)
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  menu_id BIGINT NOT NULL,
  menu_name_ko VARCHAR(100) NOT NULL,
  qty INT NOT NULL,
  base_price INT NOT NULL,
  option_price INT DEFAULT 0,
  unit_price INT NOT NULL,
  total_price INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7) order_item_options (주문 옵션 스냅샷)
CREATE TABLE IF NOT EXISTS order_item_options (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_item_id BIGINT NOT NULL,
  group_name VARCHAR(50) NOT NULL,
  item_name VARCHAR(50) NOT NULL,
  option_qty INT DEFAULT 1,
  extra_price INT DEFAULT 0,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  INDEX idx_order_item_options_oi (order_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8) payments (결제 기록)
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  method ENUM('CARD','CASH','EASY_PAY','TRANSFER') NOT NULL,
  amount INT NOT NULL,
  status ENUM('READY','SUCCESS','FAILED') DEFAULT 'READY',
  pg_tid VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_payments_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
