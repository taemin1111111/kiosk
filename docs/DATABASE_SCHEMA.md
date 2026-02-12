# Kiosk DB 전체 테이블 구조 (최종)

`USE kiosk;` 기준, CREATE + ALTER 반영한 구조입니다.

---

## 1. members
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| username | VARCHAR(30) NOT NULL UNIQUE | 로그인 아이디 |
| name | VARCHAR(50) NOT NULL | 성함 |
| email | VARCHAR(100) NOT NULL UNIQUE | 이메일 |
| password_hash | VARCHAR(255) NOT NULL | 비밀번호 해시 |
| role | ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER' | |
| created_at | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| store_point_balance | INT NOT NULL DEFAULT 0 | ALTER 추가 |
| toss_point_balance | INT NOT NULL DEFAULT 0 | ALTER 추가 |

---

## 2. categories
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| code | VARCHAR(50) NOT NULL UNIQUE | COFFEE, NON_COFFEE, GELATO, BAKERY 등 |
| name_ko | VARCHAR(50) NOT NULL | 한글명 |
| sort_order | INT NOT NULL DEFAULT 0 | |
| is_active | TINYINT(1) NOT NULL DEFAULT 1 | |
| created_at | TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP | |

---

## 3. menus
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| category_id | BIGINT NOT NULL | FK -> categories.id |
| name_ko | VARCHAR(100) NOT NULL | |
| name_en | VARCHAR(100) NULL | |
| description | TEXT NULL | |
| ingredients | TEXT NULL | 원재료/알레르기 |
| base_price | INT NOT NULL | 기본가(원) |
| is_best | TINYINT(1) NOT NULL DEFAULT 0 | Best 뱃지 |
| is_active | TINYINT(1) NOT NULL DEFAULT 1 | |
| created_at | TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP | |

---

## 4. menu_images
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| menu_id | BIGINT NOT NULL | FK -> menus.id |
| image_url | VARCHAR(500) NOT NULL | |
| is_main | TINYINT(1) NOT NULL DEFAULT 1 | 대표 이미지 |
| sort_order | INT NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP | |

---

## 5. menu_nutrition (메뉴 영양정보 – 1:1)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| menu_id | BIGINT PRIMARY KEY | FK -> menus.id |
| serving_size_g | INT NULL | 1회 제공량(g) |
| calories_kcal | INT NULL | |
| carbs_g | INT NULL | |
| sugars_g | INT NULL | |
| protein_g | INT NULL | |
| fat_g | INT NULL | |
| saturated_fat_g | INT NULL | |
| sodium_mg | INT NULL | |
| note | VARCHAR(255) NULL | |

---

## 6. option_groups
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| code | VARCHAR(50) NOT NULL UNIQUE | TEMP, BEAN, SHOT, MILK, SYRUP, WHIP, CONTAINER |
| name_ko | VARCHAR(50) NOT NULL | |
| select_type | ENUM('SINGLE','MULTI') NOT NULL DEFAULT 'SINGLE' | |
| is_required | TINYINT(1) NOT NULL DEFAULT 0 | |
| sort_order | INT NOT NULL DEFAULT 0 | |
| is_active | TINYINT(1) NOT NULL DEFAULT 1 | |

---

## 7. option_items
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| group_id | BIGINT NOT NULL | FK -> option_groups.id |
| code | VARCHAR(50) NOT NULL | UNIQUE(group_id, code) |
| name_ko | VARCHAR(50) NOT NULL | |
| name_en | VARCHAR(50) NULL | |
| extra_price | INT NOT NULL DEFAULT 0 | |
| sort_order | INT NOT NULL DEFAULT 0 | |
| is_active | TINYINT(1) NOT NULL DEFAULT 1 | |
| description | TEXT NULL | ALTER 추가 |

---

## 8. menu_option_groups
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| menu_id | BIGINT NOT NULL | FK -> menus.id |
| group_id | BIGINT NOT NULL | FK -> option_groups.id |
| sort_order | INT NOT NULL DEFAULT 0 | UNIQUE(menu_id, group_id) |

---

## 9. carts
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| member_id | BIGINT NOT NULL | FK -> members.id |
| status | ENUM('ACTIVE','ORDERED','ABANDONED') NOT NULL DEFAULT 'ACTIVE' | |
| created_at | TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP | |

---

## 10. cart_items
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| cart_id | BIGINT NOT NULL | FK -> carts.id |
| menu_id | BIGINT NOT NULL | FK -> menus.id |
| qty | INT NOT NULL DEFAULT 1 | |
| base_price | INT NOT NULL | |
| option_price | INT NOT NULL DEFAULT 0 | |
| unit_price | INT NOT NULL | |
| total_price | INT NOT NULL | |
| created_at | TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP | |

---

## 11. cart_item_options
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| cart_item_id | BIGINT NOT NULL | FK -> cart_items.id |
| group_id | BIGINT NOT NULL | FK -> option_groups.id |
| item_id | BIGINT NOT NULL | FK -> option_items.id |
| option_qty | INT NOT NULL DEFAULT 1 | |
| extra_price | INT NOT NULL DEFAULT 0 | |

---

## 12. orders
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| order_no | VARCHAR(30) NOT NULL UNIQUE | 주문번호 |
| member_id | BIGINT NOT NULL | FK -> members.id |
| status | ENUM('PENDING','PAID','CANCELLED','FAILED') NOT NULL DEFAULT 'PENDING' | |
| total_amount | INT NOT NULL | 원 |
| created_at | TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| paid_at | TIMESTAMP NULL | |
| eat_type | ENUM('IN_STORE','TAKE_OUT') NOT NULL | ALTER 추가: 매장/포장 |
| store_point_used | INT NOT NULL DEFAULT 0 | ALTER 추가 |
| toss_point_used | INT NOT NULL DEFAULT 0 | ALTER 추가 |

---

## 13. order_items
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| order_id | BIGINT NOT NULL | FK -> orders.id |
| menu_id | BIGINT NOT NULL | FK -> menus.id |
| menu_name_ko | VARCHAR(100) NOT NULL | 스냅샷 |
| qty | INT NOT NULL | |
| base_price | INT NOT NULL | |
| option_price | INT NOT NULL DEFAULT 0 | |
| unit_price | INT NOT NULL | |
| total_price | INT NOT NULL | |

---

## 14. order_item_options
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| order_item_id | BIGINT NOT NULL | FK -> order_items.id |
| group_name | VARCHAR(50) NOT NULL | 스냅샷 |
| item_name | VARCHAR(50) NOT NULL | 스냅샷 |
| option_qty | INT NOT NULL DEFAULT 1 | |
| extra_price | INT NOT NULL DEFAULT 0 | |

---

## 15. payments
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| order_id | BIGINT NOT NULL | FK -> orders.id |
| method | ENUM('CARD','CASH','EASY_PAY') NOT NULL | |
| amount | INT NOT NULL | 원 |
| status | ENUM('READY','SUCCESS','FAILED') NOT NULL DEFAULT 'READY' | |
| pg_tid | VARCHAR(100) NULL | |
| created_at | TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| approved_at | TIMESTAMP NULL | |

---

## 16. nutrition_categories (BO 영양정보 드롭다운용)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| code | VARCHAR(50) NOT NULL UNIQUE | CALORIES, CARBS 등 |
| name_ko | VARCHAR(50) NOT NULL | |
| unit | VARCHAR(20) NOT NULL | kcal, g, mg |
| sort_order | INT NOT NULL DEFAULT 0 | |
| is_active | TINYINT(1) NOT NULL DEFAULT 1 | |
| created_at | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |

---

## 17. menu_nutritions (메뉴별 영양정보 여러 줄)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| menu_id | BIGINT NOT NULL | FK -> menus.id |
| category_id | BIGINT NOT NULL | FK -> nutrition_categories.id |
| value | VARCHAR(50) NOT NULL | |
| created_at | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | |

---

## 18. service_terms
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| content | LONGTEXT NOT NULL | |
| updated_at | DATE NOT NULL | |

---

## 19. privacy_policy
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | BIGINT AUTO_INCREMENT PRIMARY KEY | |
| content | LONGTEXT NOT NULL | |
| updated_at | DATE NOT NULL | |

---

## 참고
- **orders**: `eat_type`, `store_point_used`, `toss_point_used`는 ALTER로 추가된 컬럼입니다. 백엔드 주문 생성/조회는 이 구조를 기준으로 동작합니다.
- **members**: `store_point_balance`, `toss_point_balance`도 ALTER로 추가되었습니다.
- **option_items**: `description`은 ALTER로 추가되었습니다.
- 영양정보는 **menu_nutrition**(1:1, 단일 테이블)과 **nutrition_categories + menu_nutritions**(BO 다중 입력용) 두 체계가 있습니다.
