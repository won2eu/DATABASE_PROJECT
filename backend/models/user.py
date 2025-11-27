from sqlalchemy import Column, BigInteger, String, DateTime, func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(40), nullable=False, unique=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    rooms_as_player1 = relationship("Room", foreign_keys="Room.player1_id", back_populates="player1")
    rooms_as_player2 = relationship("Room", foreign_keys="Room.player2_id", back_populates="player2")
    match_players = relationship("MatchPlayer", back_populates="user")
    round_cards = relationship("RoundCard", back_populates="player")
    actions = relationship("Action", back_populates="player")

