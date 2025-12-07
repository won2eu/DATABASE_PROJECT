from sqlalchemy.orm import Session
from sqlalchemy import text
from models.user import User
from models.role import Role, UserRole
from models.permission import Permission, RolePermission
from fastapi import HTTPException

def get_user_roles(db: Session, user_id: int) -> list[str]:
    """사용자의 역할 목록 반환"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
    role_ids = [ur.role_id for ur in user_roles]
    roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
    return [role.name for role in roles]

def has_role(db: Session, user_id: int, role_name: str) -> bool:
    """사용자가 특정 역할을 가지고 있는지 확인"""
    roles = get_user_roles(db, user_id)
    return role_name in roles

def get_user_permissions(db: Session, user_id: int) -> list[str]:
    """사용자가 가진 모든 권한 목록 반환 (역할을 통해)"""
    # 사용자의 역할들 가져오기
    user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
    role_ids = [ur.role_id for ur in user_roles]
    
    if not role_ids:
        return []
    
    # 역할들의 권한들 가져오기
    role_permissions = db.query(RolePermission).filter(
        RolePermission.role_id.in_(role_ids)
    ).all()
    
    permission_ids = [rp.permission_id for rp in role_permissions]
    
    if not permission_ids:
        return []
    
    permissions = db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
    return [perm.name for perm in permissions]

def has_permission(db: Session, user_id: int, permission_name: str) -> bool:
    """사용자가 특정 권한을 가지고 있는지 확인"""
    permissions = get_user_permissions(db, user_id)
    return permission_name in permissions

def check_permission(db: Session, user_id: int, permission_name: str) -> None:
    """사용자가 특정 권한을 가지고 있는지 확인, 없으면 예외 발생"""
    if not has_permission(db, user_id, permission_name):
        raise HTTPException(
            status_code=403,
            detail=f"이 작업을 수행할 권한이 없습니다. 필요한 권한: {permission_name}"
        )

def check_role_permission(db: Session, user_id: int, allowed_roles: list[str]) -> None:
    """사용자가 허용된 역할 중 하나를 가지고 있는지 확인, 없으면 예외 발생 (하위 호환성)"""
    user_roles = get_user_roles(db, user_id)
    
    # 허용된 역할이 없으면 모든 역할 허용
    if not allowed_roles:
        return
    
    # 사용자가 허용된 역할 중 하나라도 가지고 있는지 확인
    if not any(role in allowed_roles for role in user_roles):
        raise HTTPException(
            status_code=403,
            detail=f"이 작업을 수행할 권한이 없습니다. 필요한 역할: {', '.join(allowed_roles)}"
        )


