from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database import get_db
from models.user import User
from models.role import Role, UserRole
from schemas.user import UserCreate, UserResponse
from utils.auth import check_permission

router = APIRouter(prefix="/api/users", tags=["users"])

class AssignRoleRequest(BaseModel):
    role_name: str  # "ai_manager" or "system_admin"

def grant_postgres_role(db: Session, username: str, role_name: str):
    """PostgreSQL 역할을 사용자에게 부여 (관리자 전용)"""
    try:
        # PostgreSQL 사용자가 없으면 생성
        db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '{username}') THEN
                    EXECUTE format('CREATE USER %I', '{username}');
                END IF;
            END
            $$;
        """))
        
        # 역할 부여
        db.execute(text(f"""
            GRANT {role_name} TO {username};
        """))
        db.commit()
        print(f"✓ PostgreSQL 역할 부여 완료: {username} -> {role_name}")
    except Exception as e:
        # 역할 부여 실패해도 계속 진행
        print(f"⚠ PostgreSQL 역할 부여 실패 ({username} -> {role_name}): {e}")
        db.rollback()

@router.post("", response_model=UserResponse)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """사용자 생성"""
    # 중복 확인
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 사용자명입니다")
    
    user = User(username=user_data.username)
    db.add(user)
    db.flush()  # ID를 얻기 위해 flush
    
    # 기본 역할 부여 (member) - 애플리케이션 레벨
    member_role = db.query(Role).filter(Role.name == "member").first()
    if member_role:
        user_role = UserRole(user_id=user.id, role_id=member_role.id)
        db.add(user_role)
    
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/guest", response_model=UserResponse)
def create_guest_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """게스트 사용자 생성 (게스트 역할 자동 부여)"""
    # 중복 확인
    existing = db.query(User).filter(User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 사용자명입니다")
    
    user = User(username=user_data.username)
    db.add(user)
    db.flush()  # ID를 얻기 위해 flush
    
    # 게스트 역할 부여 - 애플리케이션 레벨
    guest_role = db.query(Role).filter(Role.name == "guest").first()
    if guest_role:
        user_role = UserRole(user_id=user.id, role_id=guest_role.id)
        db.add(user_role)
    
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/login", response_model=UserResponse)
def login(user_data: UserCreate, db: Session = Depends(get_db)):
    """username으로 로그인"""
    from utils.auth import get_user_roles
    
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    # 사용자 역할 가져오기
    roles = get_user_roles(db, user.id)
    
    # UserResponse에 역할 정보 포함
    user_dict = {
        "id": user.id,
        "username": user.username,
        "created_at": user.created_at,
        "roles": roles
    }
    return UserResponse(**user_dict)

@router.post("/{user_id}/assign-role", response_model=UserResponse)
def assign_role(
    user_id: int, 
    request: AssignRoleRequest, 
    admin_user_id: int = Query(..., description="역할을 부여하는 관리자 ID"),
    db: Session = Depends(get_db)
):
    """사용자에게 역할 부여 (시스템 관리자만 가능)"""
    # 권한 체크: manage_roles 권한 필요
    check_permission(db, admin_user_id, "manage_roles")
    
    # 사용자 확인
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    # 역할 확인
    role = db.query(Role).filter(Role.name == request.role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="역할을 찾을 수 없습니다")
    
    # 이미 역할이 있는지 확인
    existing = db.query(UserRole).filter(
        UserRole.user_id == user_id,
        UserRole.role_id == role.id
    ).first()
    
    if not existing:
        # 애플리케이션 레벨 역할 부여
        user_role = UserRole(user_id=user.id, role_id=role.id, granted_by=admin_user_id)
        db.add(user_role)
        db.commit()
    
    # AI 관리자 또는 시스템 관리자 역할이면 PostgreSQL 역할도 부여
    if request.role_name in ["ai_manager", "system_admin"]:
        grant_postgres_role(db, user.username, request.role_name)
    
    db.refresh(user)
    return user

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """사용자 정보 조회"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    return user

