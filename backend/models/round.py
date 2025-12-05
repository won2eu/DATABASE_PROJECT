from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey, JSON, func, Index, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from database import Base
from .enums import RoundState, ActionType, CardSide, RoundResult

class Round(Base):
    __tablename__ = "rounds"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    match_id = Column(BigInteger, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    round_no = Column(Integer, nullable=False)
    state = Column(String(20), nullable=False)  # RoundState enum
    pot = Column(Integer, nullable=False, server_default="0")
    carry_over_pot = Column(Integer, nullable=False, server_default="0")
    current_turn_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    min_bet = Column(Integer, nullable=False, server_default="1")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)
    
    # 라운드 결과 필드
    result = Column(String(20), nullable=True)  # RoundResult enum (라운드 종료 시 설정)
    winner_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)  # 승자 (무승부 시 NULL)
    is_double_side_bet = Column(Boolean, nullable=False, server_default="false")  # 양면 베팅 발생 여부
    double_side_bonus = Column(Integer, nullable=False, server_default="0")  # 양면 베팅 보너스/페널티 (+10 또는 -10)
    
    # Relationships
    match = relationship("Match", back_populates="rounds")
    current_turn_user = relationship("User", foreign_keys=[current_turn_user_id])
    winner = relationship("User", foreign_keys=[winner_id])
    round_cards = relationship("RoundCard", back_populates="round", cascade="all, delete-orphan")
    actions = relationship("Action", back_populates="round", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("match_id", "round_no", name="uq_match_round"),
        Index("idx_rounds_match_round", "match_id", "round_no"),
    )

class RoundCard(Base):
    __tablename__ = "round_cards"
    
    round_id = Column(BigInteger, ForeignKey("rounds.id", ondelete="CASCADE"), primary_key=True)
    player_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    front_value = Column(Integer, nullable=False)
    back_value = Column(Integer, nullable=False)
    chosen_side = Column(String(20), nullable=True)  # CardSide enum
    
    # Relationships
    round = relationship("Round", back_populates="round_cards")
    player = relationship("User", back_populates="round_cards")
    
    __table_args__ = (
        Index("idx_round_cards_round", "round_id"),
    )

class Action(Base):
    __tablename__ = "actions"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    round_id = Column(BigInteger, ForeignKey("rounds.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String(20), nullable=False)  # ActionType enum
    amount = Column(Integer, nullable=True)
    payload = Column(JSON, nullable=False, server_default="{}")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    round = relationship("Round", back_populates="actions")
    player = relationship("User", back_populates="actions")
    
    __table_args__ = (
        Index("idx_actions_round_created", "round_id", "created_at"),
    )

