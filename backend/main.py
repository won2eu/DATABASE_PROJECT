from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from routers import users, rooms, matches, rounds, websocket

load_dotenv()

app = FastAPI(title="DB Term Project API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 기본 포트
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(users.router)
app.include_router(rooms.router)
app.include_router(matches.router)
app.include_router(rounds.router)
app.include_router(websocket.router)

def create_db_and_table():
    """데이터베이스 및 테이블 생성"""
    import os
    from sqlalchemy import create_engine, text
    from database import init_db, engine
    
    try:
        # 데이터베이스가 없으면 생성
        db_url = os.getenv(
            "DATABASE_URL",
            "postgresql://sw@localhost:5432/db_term_project"
        )
        
        # postgres 기본 DB에 연결하여 db_term_project 생성
        if "db_term_project" in db_url:
            postgres_url = db_url.replace("/db_term_project", "/postgres")
            temp_engine = create_engine(postgres_url)
            
            with temp_engine.connect() as conn:
                conn.execute(text("COMMIT"))
                result = conn.execute(text(
                    "SELECT 1 FROM pg_database WHERE datname = 'db_term_project'"
                ))
                if not result.fetchone():
                    conn.execute(text("CREATE DATABASE db_term_project"))
                    print("✓ 데이터베이스 'db_term_project' 생성 완료")
                else:
                    print("✓ 데이터베이스 'db_term_project' 이미 존재")
            temp_engine.dispose()
        
        # 테이블 생성
        init_db()
        print("✓ 데이터베이스 테이블 초기화 완료")
    except Exception as e:
        print(f"⚠ 데이터베이스 테이블 생성 중 오류: {e}")
        print("PostgreSQL이 실행 중인지 확인하세요.")

@app.on_event("startup")
def on_startup():
    create_db_and_table()

