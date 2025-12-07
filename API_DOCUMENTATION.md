# 프로젝트 API 및 기능 문서

## 목차
1. [사용자 관리 API](#사용자-관리-api)
2. [방 관리 API](#방-관리-api)
3. [매치 관리 API](#매치-관리-api)
4. [라운드 관리 API](#라운드-관리-api)
5. [웹소켓 API](#웹소켓-api)
6. [데이터베이스 초기화](#데이터베이스-초기화)

---

## 사용자 관리 API

### 1. POST `/api/users`
**기능**: 일반 회원 가입  
**대상 사용자**: 모든 사용자 (게스트 포함)  
**SQL Features**:
- `INSERT` - 사용자 생성
- `SELECT ... WHERE` - 중복 사용자명 확인 (`User.username == user_data.username`)
- `INSERT` - 기본 역할(member) 부여
- `TRANSACTION` - commit/rollback
- `UNIQUE CONSTRAINT` - username 중복 방지

**설명**: 
- 사용자 생성 시 자동으로 `member` 역할 부여
- `user_roles` 테이블에 역할 연결 정보 저장

---

### 2. POST `/api/users/guest`
**기능**: 게스트 사용자 생성  
**대상 사용자**: 모든 사용자  
**SQL Features**:
- `INSERT` - 게스트 사용자 생성
- `SELECT ... WHERE` - 중복 사용자명 확인
- `INSERT` - 게스트 역할 부여
- `TRANSACTION` - commit/rollback
- `UNIQUE CONSTRAINT` - username 중복 방지

**설명**: 
- 게스트 역할 자동 부여
- 방 참가만 가능, 방 생성 불가

---

### 3. POST `/api/users/login`
**기능**: 사용자 로그인  
**대상 사용자**: 모든 사용자  
**SQL Features**:
- `SELECT ... WHERE` - 사용자 조회 (`User.username == user_data.username`)
- `SELECT ... WHERE ... IN` - 사용자 역할 조회 (JOIN을 통한 다중 테이블 조회)
- `JOIN` - UserRole과 Role 테이블 조인 (간접적)

**설명**: 
- username으로 로그인
- 사용자 역할 정보 포함하여 반환

---

### 4. POST `/api/users/{user_id}/assign-role`
**기능**: 사용자에게 역할 부여  
**대상 사용자**: 시스템 관리자 (manage_roles 권한 필요)  
**SQL Features**:
- `SELECT ... WHERE` - 권한 체크 (JOIN을 통한 다중 테이블 조회)
- `SELECT ... WHERE ... IN` - 사용자 권한 조회
- `SELECT` - 사용자 확인
- `SELECT` - 역할 확인
- `SELECT ... WHERE ... AND` - 중복 역할 확인
- `INSERT` - 역할 부여
- `DO $$ ... $$` - PostgreSQL PL/pgSQL 블록 (역할 생성)
- `CREATE USER` - PostgreSQL 사용자 생성
- `GRANT` - PostgreSQL 역할 부여
- `TRANSACTION` - commit/rollback

**설명**: 
- 애플리케이션 레벨 역할 부여
- AI 관리자/시스템 관리자 역할 시 PostgreSQL 레벨 역할도 부여

---

### 5. GET `/api/users/{user_id}`
**기능**: 사용자 정보 조회  
**대상 사용자**: 모든 사용자  
**SQL Features**:
- `SELECT ... WHERE` - 사용자 조회 (`User.id == user_id`)

---

## 방 관리 API

### 6. POST `/api/rooms`
**기능**: 게임 방 생성  
**대상 사용자**: Member 이상 (create_room 권한 필요)  
**SQL Features**:
- `SELECT ... WHERE` - 플레이어 확인
- `SELECT ... WHERE ... IN` - 권한 체크 (JOIN을 통한 다중 테이블 조회)
- `INSERT` - 방 생성
- `TRANSACTION` - commit/rollback
- `UNIQUE CONSTRAINT` - invite_code 중복 방지

**설명**: 
- 초대 코드 자동 생성
- 방 생성자(player1) 자동 등록

---

### 7. POST `/api/rooms/{room_id}/join`
**기능**: 방 참가  
**대상 사용자**: Guest 이상 (join_room 권한 필요)  
**SQL Features**:
- `SELECT ... WHERE` - 방 조회
- `SELECT ... WHERE` - 플레이어 확인
- `UPDATE` - 방 상태 및 player2_id 업데이트
- `INSERT` - 매치 생성 (GameService.start_match 호출)
- `INSERT` - 라운드 생성 (GameService.start_round 호출)
- `TRANSACTION` - commit/rollback
- `CASCADE DELETE` - 외래키 제약조건

**설명**: 
- 두 플레이어가 모두 참가하면 자동으로 매치 및 첫 라운드 시작
- 방 상태를 PLAYING으로 변경

---

### 8. GET `/api/rooms/{room_id}`
**기능**: 방 정보 조회  
**대상 사용자**: Guest 이상 (view_room 권한 필요)  
**SQL Features**:
- `SELECT ... WHERE` - 방 조회 (`Room.id == room_id`)

---

## 매치 관리 API

### 9. POST `/api/matches`
**기능**: 매치 시작  
**대상 사용자**: 게임 플레이어  
**SQL Features**:
- `INSERT` - 매치 생성
- `INSERT` - 플레이어 등록 (MatchPlayer)
- `SELECT ... WHERE` - 플레이어 조회
- `JOIN` - MatchPlayer와 User 조인 (간접적)
- `TRANSACTION` - commit/rollback
- `CASCADE DELETE` - 외래키 제약조건

**설명**: 
- 덱 생성 및 섞기 (DeckService)
- 플레이어 칩 초기화 (30칩)

---

### 10. GET `/api/matches/room/{room_id}`
**기능**: 방의 활성 매치 조회  
**대상 사용자**: 게임 플레이어  
**SQL Features**:
- `SELECT ... WHERE ... AND` - 활성 매치 조회 (`room_id`, `status == ACTIVE`)
- `ORDER BY` - 최신 매치 우선 (`created_at DESC`)
- `SELECT ... WHERE` - 플레이어 조회
- `JOIN` - MatchPlayer와 User 조인 (간접적)

---

### 11. GET `/api/matches/{match_id}`
**기능**: 매치 정보 조회  
**대상 사용자**: 게임 플레이어  
**SQL Features**:
- `SELECT ... WHERE` - 매치 조회 (`Match.id == match_id`)
- `SELECT ... WHERE` - 플레이어 조회
- `JOIN` - MatchPlayer와 User 조인 (간접적)

---

## 라운드 관리 API

### 12. POST `/api/rounds/{match_id}/start`
**기능**: 라운드 시작  
**대상 사용자**: 게임 플레이어  
**SQL Features**:
- `SELECT ... WHERE` - 매치 조회
- `SELECT ... WHERE ... ORDER BY` - 마지막 라운드 조회 (`round_no DESC`)
- `SELECT ... WHERE ... AND` - 중복 라운드 확인
- `SELECT ... WHERE` - 플레이어 조회
- `SELECT ... WHERE` - 이전 라운드 조회 (carry_over_pot 계산)
- `INSERT` - 라운드 생성
- `INSERT` - 카드 생성 (RoundCard)
- `INSERT` - 기본 베팅 액션 생성 (Action)
- `UPDATE` - 플레이어 칩 감소
- `TRANSACTION` - commit/rollback
- `CASCADE DELETE` - 외래키 제약조건
- `UNIQUE CONSTRAINT` - match_id + round_no 중복 방지

**설명**: 
- 카드 딜링
- 각 플레이어 1칩 기본 베팅
- 이전 라운드 carry_over_pot 이월

---

### 13. POST `/api/rounds/{round_id}/select-side`
**기능**: 베팅 면 선택  
**대상 사용자**: 게임 플레이어  
**SQL Features**:
- `SELECT ... WHERE` - 라운드 조회
- `SELECT ... WHERE ... AND` - 플레이어 카드 조회
- `UPDATE` - 카드 chosen_side 업데이트
- `INSERT` - 액션 기록 (SELECT_SIDE)
- `SELECT ... WHERE` - 모든 카드 조회 (양면베팅 확인)
- `UPDATE` - 라운드 상태 업데이트
- `TRANSACTION` - commit/rollback

**설명**: 
- front, back, double_side 중 선택
- 두 플레이어 모두 선택 시 베팅 단계로 전환

---

### 14. POST `/api/rounds/{round_id}/action`
**기능**: 베팅 액션 수행 (bet, raise, call, fold)  
**대상 사용자**: 게임 플레이어  
**SQL Features**:
- `SELECT ... WHERE ... IN` - 현재 베팅 금액 조회 (`action_type IN ['bet', 'raise']`)
- `ORDER BY` - 최신 액션 우선 (`created_at DESC`)
- `SELECT ... WHERE ... IN` - 플레이어 총 베팅 금액 조회
- `SELECT ... WHERE ... AND` - 플레이어 카드 조회 (양면베팅 확인)
- `SELECT ... WHERE` - 라운드 조회
- `SELECT ... WHERE` - 매치 조회
- `SELECT ... WHERE ... AND` - 플레이어 매치 정보 조회
- `SELECT ... WHERE` - 상대 플레이어 조회
- `INSERT` - 액션 기록 (FOLD, BET, RAISE, CALL)
- `UPDATE` - 플레이어 칩 업데이트
- `UPDATE` - 라운드 pot 업데이트
- `UPDATE` - 라운드 상태 업데이트
- `SELECT ... WHERE` - 라운드 카드 조회 (승자 판정)
- `SELECT ... WHERE` - 플레이어 조회
- `UPDATE` - 라운드 결과 업데이트
- `UPDATE` - 매치 상태 업데이트
- `TRANSACTION` - commit/rollback (에러 시 rollback)
- `CASCADE DELETE` - 외래키 제약조건

**설명**: 
- 베팅, 레이즈, 콜, 폴드 처리
- 양면베팅 시 칩 계산 (2배 소모)
- 승자 판정 및 칩 지급
- 매치 종료 조건 확인

---

### 15. GET `/api/rounds/match/{match_id}/current`
**기능**: 현재 라운드 조회  
**대상 사용자**: 게임 플레이어  
**SQL Features**:
- `SELECT ... WHERE ... ORDER BY` - 최신 라운드 조회 (`round_no DESC`)
- `SELECT ... WHERE` - 라운드 카드 조회
- `SELECT ... WHERE ... ORDER BY` - 액션 조회 (`created_at`)

---

### 16. GET `/api/rounds/{round_id}`
**기능**: 라운드 정보 조회  
**대상 사용자**: 게임 플레이어  
**SQL Features**:
- `SELECT ... WHERE` - 라운드 조회
- `SELECT ... WHERE` - 라운드 카드 조회
- `SELECT ... WHERE ... ORDER BY` - 액션 조회 (`created_at`)

---

## 웹소켓 API

### 17. WebSocket `/ws/room/{room_id}/user/{user_id}`
**기능**: 실시간 게임 통신  
**대상 사용자**: 게임 플레이어 (방 참가자만)  
**SQL Features**:
- `SELECT ... WHERE` - 방 조회
- `SELECT ... WHERE ... OR` - 플레이어 확인 (`player1_id == user_id OR player2_id == user_id`)
- `TRANSACTION` - rollback (에러 시)

**설명**: 
- 실시간 메시지 전송
- 플레이어 연결/해제 알림
- 핑/퐁 메시지 처리

---

## 데이터베이스 초기화

### 18. init_db() - 애플리케이션 시작 시 자동 실행
**기능**: 데이터베이스 및 테이블 생성  
**대상 사용자**: 시스템 (애플리케이션 시작 시)  
**SQL Features**:
- `CREATE DATABASE` - 데이터베이스 생성
- `CREATE TABLE` - 모든 테이블 생성
- `PRIMARY KEY` - 기본키 제약조건
- `FOREIGN KEY` - 외래키 제약조건
- `UNIQUE CONSTRAINT` - 유니크 제약조건
- `INDEX` - 인덱스 생성
- `CASCADE DELETE` - 연쇄 삭제 설정
- `DEFAULT` - 기본값 설정
- `NOT NULL` - NULL 제약조건

---

### 19. init_roles() - 기본 역할 초기화
**기능**: 기본 역할 데이터 생성  
**대상 사용자**: 시스템 (초기화 시)  
**SQL Features**:
- `SELECT` - 기존 역할 확인
- `INSERT ... ON CONFLICT DO NOTHING` - 역할 삽입 (충돌 시 무시)
- `NOW()` - 현재 시간 함수
- `TRANSACTION` - commit/rollback

**설명**: 
- guest, member, ai_manager, system_admin 역할 생성

---

### 20. init_permissions() - 기본 권한 초기화
**기능**: 기본 권한 데이터 생성  
**대상 사용자**: 시스템 (초기화 시)  
**SQL Features**:
- `SELECT` - 기존 권한 확인
- `INSERT ... ON CONFLICT DO NOTHING` - 권한 삽입
- `NOW()` - 현재 시간 함수
- `TRANSACTION` - commit/rollback

**설명**: 
- create_room, join_room, view_room, manage_ai, manage_users, manage_roles, view_game_data, manage_game_data 권한 생성

---

### 21. init_role_permissions() - 역할-권한 연결 초기화
**기능**: 역할과 권한 연결  
**대상 사용자**: 시스템 (초기화 시)  
**SQL Features**:
- `SELECT COUNT(*)` - 집계 함수 (기존 연결 확인)
- `SELECT` - 모든 권한 조회
- `SELECT ... WHERE` - 역할 조회
- `SELECT ... WHERE` - 권한 조회
- `INSERT ... ON CONFLICT DO NOTHING` - 역할-권한 연결 삽입
- `TRANSACTION` - commit/rollback

**설명**: 
- 각 역할에 적절한 권한 부여
- guest: join_room, view_room
- member: create_room, join_room, view_room, view_game_data
- ai_manager: create_room, join_room, view_room, manage_ai, view_game_data
- system_admin: 모든 권한

---

### 22. init_db_permissions() - PostgreSQL 레벨 권한 초기화
**기능**: PostgreSQL 데이터베이스 레벨 권한 부여  
**대상 사용자**: 시스템 (초기화 시)  
**SQL Features**:
- `DO $$ ... $$` - PL/pgSQL 블록
- `SELECT ... FROM pg_roles` - 시스템 카탈로그 조회
- `CREATE ROLE` - PostgreSQL 역할 생성
- `GRANT SELECT` - 조회 권한 부여
- `GRANT INSERT` - 삽입 권한 부여
- `GRANT UPDATE` - 수정 권한 부여
- `GRANT DELETE` - 삭제 권한 부여
- `GRANT ALL PRIVILEGES` - 모든 권한 부여
- `TRANSACTION` - commit/rollback

**설명**: 
- 역할별 테이블 접근 권한 설정
- 게스트: 제한적 권한
- 회원: 게임 플레이 권한
- AI 관리자: 게임 데이터 조회 권한
- 시스템 관리자: 모든 권한

---

## 서비스 레이어 SQL Features

### DeckService

#### create_card_templates()
**SQL Features**:
- `SELECT` - 기존 템플릿 확인
- `INSERT` - 카드 템플릿 생성
- `TRANSACTION` - commit

#### shuffle_deck()
**SQL Features**:
- `DELETE ... WHERE` - 기존 덱 인스턴스 삭제
- `SELECT` - 카드 템플릿 조회
- `INSERT` - 덱 인스턴스 생성
- `TRANSACTION` - commit

#### deal_card()
**SQL Features**:
- `SELECT ... WHERE ... AND` - 덱 인스턴스 조회
- `SELECT ... WHERE ... ORDER BY ... DESC` - 최대 order_no 조회
- `DELETE ... WHERE` - 덱 재생성 시 기존 인스턴스 삭제
- `TRANSACTION` - commit

#### get_remaining_cards()
**SQL Features**:
- `COUNT(*)` - 집계 함수 (남은 카드 수)

---

### BettingService

#### get_current_bet_amount()
**SQL Features**:
- `SELECT ... WHERE ... IN` - 베팅/레이즈 액션 조회
- `ORDER BY ... DESC` - 최신 액션 우선

#### get_player_bet_total()
**SQL Features**:
- `SELECT ... WHERE ... AND ... IN` - 플레이어 액션 조회
- `SUM()` - 집계 함수 (총 베팅 금액)

#### is_double_side_bet()
**SQL Features**:
- `SELECT ... WHERE ... AND` - 플레이어 카드 조회

#### process_action()
**SQL Features**:
- `SELECT ... WHERE ... IN` - 액션 조회
- `SELECT ... WHERE ... AND` - 라운드/플레이어 조회
- `INSERT` - 액션 기록
- `UPDATE` - 칩, pot, 상태 업데이트
- `SELECT ... WHERE` - 승자 판정을 위한 카드 조회
- `TRANSACTION` - commit/rollback

---

### Auth Service

#### get_user_roles()
**SQL Features**:
- `SELECT ... WHERE` - 사용자 역할 조회
- `SELECT ... WHERE ... IN` - 역할 조회 (JOIN 대신 IN 사용)

#### get_user_permissions()
**SQL Features**:
- `SELECT ... WHERE` - 사용자 역할 조회
- `SELECT ... WHERE ... IN` - 역할 권한 조회
- `SELECT ... WHERE ... IN` - 권한 조회
- 다중 테이블 조인 (간접적)

#### has_permission()
**SQL Features**:
- `SELECT ... WHERE ... IN` - 권한 조회 (간접적)

---

## 사용된 주요 SQL Features 요약

### DDL (Data Definition Language)
- `CREATE DATABASE`
- `CREATE TABLE`
- `CREATE ROLE`
- `PRIMARY KEY`
- `FOREIGN KEY`
- `UNIQUE CONSTRAINT`
- `INDEX`
- `DEFAULT`
- `NOT NULL`
- `CASCADE DELETE`

### DML (Data Manipulation Language)
- `SELECT` (단순 조회, WHERE, ORDER BY, JOIN)
- `INSERT` (단순 삽입, ON CONFLICT)
- `UPDATE`
- `DELETE`

### DCL (Data Control Language)
- `GRANT` (SELECT, INSERT, UPDATE, DELETE, ALL PRIVILEGES)
- `REVOKE` (간접적)

### 고급 기능
- `TRANSACTION` (COMMIT, ROLLBACK)
- `JOIN` (간접적, ORM을 통한 관계 조회)
- `WHERE ... IN` (다중 값 조건)
- `ORDER BY` (정렬)
- `COUNT(*)`, `SUM()` (집계 함수)
- `NOW()` (날짜/시간 함수)
- `ON CONFLICT DO NOTHING` (충돌 처리)
- `DO $$ ... $$` (PL/pgSQL 블록)
- `JSON` 타입
- 시스템 카탈로그 조회 (`pg_roles`, `pg_user`, `pg_database`)

---

## 역할별 접근 권한 요약

### Guest (게스트)
- 방 참가 (join_room)
- 방 조회 (view_room)
- 게임 플레이 (제한적)
- 회원가입

### Member (일반 회원)
- Guest 권한 +
- 방 생성 (create_room)
- 게임 데이터 조회 (view_game_data)
- 카드 템플릿 생성

### AI Manager (AI 관리자)
- Member 권한 +
- AI 관리 (manage_ai)
- 게임 데이터 조회 (확장)

### System Admin (시스템 관리자)
- 모든 권한
- 사용자 관리 (manage_users)
- 역할 관리 (manage_roles)
- 게임 데이터 관리 (manage_game_data)
- PostgreSQL 레벨 모든 권한

