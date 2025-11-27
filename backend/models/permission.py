from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, func, Text
from sqlalchemy.orm import relationship
from database import Base

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)  # 예: "create_room", "select_game_data"
    resource = Column(String(100), nullable=False)  # 예: "rooms", "game_data", "card_templates"
    action = Column(String(50), nullable=False)  # 예: "INSERT", "SELECT", "UPDATE", "DELETE"
    description = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")

class RolePermission(Base):
    __tablename__ = "role_permissions"
    
    role_id = Column(BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(BigInteger, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
    granted_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="role_permissions")

