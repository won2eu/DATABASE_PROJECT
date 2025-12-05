from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class RoundCardInfo(BaseModel):
    player_id: int
    front_value: int
    back_value: int
    chosen_side: Optional[str]
    
    class Config:
        from_attributes = True

class ActionInfo(BaseModel):
    id: int
    player_id: int
    action_type: str
    amount: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

class RoundResponse(BaseModel):
    id: int
    match_id: int
    round_no: int
    state: str
    pot: int
    carry_over_pot: int
    current_turn_user_id: Optional[int]
    min_bet: int
    result: Optional[str]
    winner_id: Optional[int]
    is_double_side_bet: bool
    double_side_bonus: int
    created_at: datetime
    ended_at: Optional[datetime]
    cards: List[RoundCardInfo]
    actions: List[ActionInfo]
    
    class Config:
        from_attributes = True

class SideSelectionRequest(BaseModel):
    player_id: int
    side: str  # "front", "back", or "double_side"

class ActionRequest(BaseModel):
    player_id: int
    action_type: str  # "bet", "call", "raise", "fold", "double_side"
    amount: Optional[int] = None  # bet, raise 시 필수

class ActionResponse(BaseModel):
    success: bool
    message: str
    round: Optional[RoundResponse] = None

