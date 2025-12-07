# 포커 게임 프로젝트

데이터베이스 기반 포커 게임 웹 애플리케이션입니다.

## 프로젝트 구조

```
DATABASE_PROJECT/
├── backend/          # FastAPI 백엔드 서버
│   ├── models/      # 데이터베이스 모델
│   ├── routers/     # API 라우터
│   ├── services/    # 비즈니스 로직
│   ├── schemas/     # Pydantic 스키마
│   └── utils/       # 유틸리티 함수
├── frontend/        # Next.js 프론트엔드
└── README.md        # 프로젝트 문서
```

## 사전 요구사항

### 필수 소프트웨어
- **Python 3.8 이상**
- **Node.js 18 이상** 및 **npm**
- **PostgreSQL 12 이상**

### 설치 확인
```bash
# Python 버전 확인
python --version

# Node.js 버전 확인
node --version
npm --version

# PostgreSQL 버전 확인
psql --version
```

## 설치 및 실행 방법

### 1. 데이터베이스 설정

#### PostgreSQL 설치 및 실행
1. PostgreSQL 설치 (아직 설치하지 않은 경우)
   - Windows: [PostgreSQL 공식 사이트](https://www.postgresql.org/download/windows/)에서 다운로드
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql` (Ubuntu/Debian)

2. PostgreSQL 서비스 시작
   ```bash
   # Windows (서비스 관리자에서 시작)
   # 또는 명령 프롬프트에서:
   net start postgresql-x64-XX
   
   # macOS/Linux
   brew services start postgresql
   # 또는
   sudo systemctl start postgresql
   ```

3. PostgreSQL 접속 및 데이터베이스 생성 (선택사항)
   ```bash
   psql -U postgres
   ```
   ```sql
   CREATE DATABASE db_term_project;
   \q
   ```
   > 참고: 애플리케이션 시작 시 자동으로 데이터베이스가 생성됩니다.

### 2. 백엔드 설정

#### 1) 프로젝트 디렉토리로 이동
```bash
cd DATABASE_PROJECT/backend
```

#### 2) 가상 환경 생성 및 활성화
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 3) 의존성 설치
```bash
pip install -r requirements.txt
```

#### 4) 환경 변수 설정
```bash
# env.example 파일을 .env로 복사
# Windows
copy env.example .env

# macOS/Linux
cp env.example .env
```

`.env` 파일을 열어서 데이터베이스 연결 정보를 수정하세요:
```env
DATABASE_URL=postgresql://사용자명:비밀번호@localhost:5432/db_term_project
```

#### 5) 백엔드 서버 실행
```bash
# 방법 1: uvicorn 직접 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000


백엔드 서버가 `http://localhost:8000`에서 실행됩니다.

**API 문서 확인:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 3. 프론트엔드 설정

#### 1) 새 터미널 창 열기
백엔드 서버와 별도로 실행해야 합니다.

#### 2) 프로젝트 디렉토리로 이동
```bash
cd DATABASE_PROJECT/frontend
```

#### 3) 의존성 설치
```bash
npm install
```

#### 4) 프론트엔드 서버 실행
```bash
npm run dev
```

프론트엔드 서버가 `http://localhost:3000`에서 실행됩니다.

브라우저에서 http://localhost:3000 을 열어 애플리케이션을 확인하세요.

## 실행 순서 요약

1. **PostgreSQL 서비스 시작**
2. **백엔드 실행** (터미널 1)
   ```bash
   cd backend
   # 가상환경 활성화 (처음 한 번만)
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # macOS/Linux
   
   # 의존성 설치 (처음 한 번만)
   pip install -r requirements.txt
   
   # 서버 실행
   uvicorn main:app --reload
   ```

3. **프론트엔드 실행** (터미널 2)
   ```bash
   cd frontend
   # 의존성 설치 (처음 한 번만)
   npm install
   
   # 서버 실행
   npm run dev
   ```

4. **브라우저에서 접속**
   - http://localhost:3000

## 주요 기능

### 사용자 관리
- 회원 가입 (자동으로 member 역할 부여)
- 게스트 가입 (guest 역할)
- 로그인
- 역할 부여 (관리자 전용)

### 게임 기능
- 방 생성 및 참가
- 실시간 포커 게임 플레이
- 베팅 액션 (bet, raise, call, fold)
- 양면 베팅 옵션
- 게임 로그 저장

### 권한 시스템
- 역할 기반 접근 제어 (RBAC)
- PostgreSQL 레벨 권한 관리
- 애플리케이션 레벨 권한 체크

## 데이터베이스 초기화

애플리케이션을 처음 실행하면 자동으로:
- 데이터베이스 생성 (없는 경우)
- 모든 테이블 생성
- 기본 역할 및 권한 초기화
- PostgreSQL 레벨 권한 설정

수동으로 초기화하려면:
```bash
cd backend
python -c "from database import init_db; init_db()"
```

## 문제 해결

### PostgreSQL 연결 오류
```
⚠ 데이터베이스 테이블 생성 중 오류: ...
PostgreSQL이 실행 중인지 확인하세요.
```

**해결 방법:**
1. PostgreSQL 서비스가 실행 중인지 확인
2. `.env` 파일의 `DATABASE_URL`이 올바른지 확인
3. PostgreSQL 사용자명과 비밀번호 확인

### 포트 충돌
- 백엔드 포트 8000이 이미 사용 중인 경우:
  ```bash
  uvicorn main:app --reload --port 8001
  ```
  그리고 `frontend`에서 API 호출 URL도 변경 필요

- 프론트엔드 포트 3000이 이미 사용 중인 경우:
  ```bash
  npm run dev -- -p 3001
  ```

### Python 가상 환경 오류
```bash
# 가상 환경 재생성
rm -rf venv  # 또는 rmdir /s venv (Windows)
python -m venv venv
# 다시 활성화 및 의존성 설치
```

### npm 패키지 설치 오류
```bash
# 캐시 삭제 후 재설치
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 개발 환경

- **Backend**: FastAPI 0.115.0, SQLAlchemy 2.0.36, PostgreSQL
- **Frontend**: Next.js 16.0.5, React 19.2.0, TypeScript
- **Database**: PostgreSQL 12+

## API 문서

백엔드 서버 실행 후:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

자세한 API 문서는 `API_DOCUMENTATION.md` 파일을 참조하세요.

## 프로젝트 구조 상세

### Backend
- `models/`: SQLAlchemy ORM 모델 정의
- `routers/`: FastAPI 라우터 (API 엔드포인트)
- `services/`: 비즈니스 로직 (게임 로직, 베팅 로직 등)
- `schemas/`: Pydantic 스키마 (요청/응답 검증)
- `utils/`: 유틸리티 함수 (인증, 권한 체크 등)

### Frontend
- `app/`: Next.js App Router 구조
- `components/`: React 컴포넌트
- `public/`: 정적 파일

## 라이선스

이 프로젝트는 학술 목적으로 제작되었습니다.

## 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

