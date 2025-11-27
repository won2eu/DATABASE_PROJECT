from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, func, Index
from sqlalchemy.orm import relationship
from database import Base
from .enums import RoomStatus

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    invite_code = Column(String(16), nullable=False, unique=True)
    status = Column(String(20), nullable=False)  # RoomStatus enum
    player1_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    player2_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    player1 = relationship("User", foreign_keys=[player1_id], back_populates="rooms_as_player1")
    player2 = relationship("User", foreign_keys=[player2_id], back_populates="rooms_as_player2")
    matches = relationship("Match", back_populates="room", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_rooms_status_created", "status", "created_at"),
    )

