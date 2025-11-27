from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)  # guest, member, table_manager, ai_manager, system_admin
    description = Column(String(255))
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")

class UserRole(Base):
    __tablename__ = "user_roles"
    
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    granted_at = Column(DateTime, nullable=False, server_default=func.now())
    granted_by = Column(BigInteger, ForeignKey("users.id"))  # System Admin이 부여한 경우
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="roles")
    role = relationship("Role", back_populates="user_roles")
    granter = relationship("User", foreign_keys=[granted_by])

