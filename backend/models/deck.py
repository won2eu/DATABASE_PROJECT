from sqlalchemy import Column, BigInteger, Integer, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from database import Base

class CardTemplate(Base):
    __tablename__ = "card_templates"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    front_value = Column(Integer, nullable=False)
    back_value = Column(Integer, nullable=False)
    copies = Column(Integer, nullable=False)  # copies 합이 90이 되도록 구성
    
    # Relationships
    deck_instances = relationship("DeckInstance", back_populates="card_template")

class DeckInstance(Base):
    __tablename__ = "deck_instances"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    match_id = Column(BigInteger, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    card_template_id = Column(BigInteger, ForeignKey("card_templates.id", ondelete="CASCADE"), nullable=False)
    order_no = Column(Integer, nullable=False)  # 1부터 시작 (섞인 순서)
    
    # Relationships
    match = relationship("Match", back_populates="deck_instances")
    card_template = relationship("CardTemplate", back_populates="deck_instances")
    
    __table_args__ = (
        UniqueConstraint("match_id", "order_no", name="uq_match_order"),
        Index("idx_deck_match_order", "match_id", "order_no"),
    )

