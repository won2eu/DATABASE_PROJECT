from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey, JSON, Boolean, func, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
from .enums import MatchStatus

class Match(Base):
    __tablename__ = "matches"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    room_id = Column(BigInteger, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False)  # MatchStatus enum
    deck_seed = Column(BigInteger, nullable=False)
    settings = Column(JSON, nullable=False, server_default="{}")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)
    
    # Relationships
    room = relationship("Room", back_populates="matches")
    match_players = relationship("MatchPlayer", back_populates="match", cascade="all, delete-orphan")
    rounds = relationship("Round", back_populates="match", cascade="all, delete-orphan")
    deck_instances = relationship("DeckInstance", back_populates="match", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_matches_room_status", "room_id", "status"),
    )

class MatchPlayer(Base):
    __tablename__ = "match_players"
    
    match_id = Column(BigInteger, ForeignKey("matches.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    seat = Column(Integer, nullable=False)  # 0 or 1
    chips = Column(Integer, nullable=False)  # 시작 30
    is_bot = Column(Boolean, nullable=False, server_default="false")
    
    # Relationships
    match = relationship("Match", back_populates="match_players")
    user = relationship("User", back_populates="match_players")
    
    __table_args__ = (
        UniqueConstraint("match_id", "seat", name="uq_match_seat"),
    )

