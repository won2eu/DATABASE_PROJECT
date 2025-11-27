from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL 연결 설정
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://sw@localhost:5432/db_term_project"
)

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """데이터베이스 세션 의존성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """데이터베이스 테이블 생성"""
    # 모든 모델을 import하여 Base에 등록
    from models import (
        User, Role, UserRole, Permission, RolePermission,
        Room, Match, MatchPlayer, Round, RoundCard, Action,
        CardTemplate, DeckInstance
    )
    Base.metadata.create_all(bind=engine)

