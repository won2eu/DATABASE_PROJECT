from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class MatchStart(BaseModel):
    room_id: int

class MatchPlayerInfo(BaseModel):
    user_id: int
    username: str
    seat: int
    chips: int
    is_bot: bool
    
    class Config:
        from_attributes = True

class MatchResponse(BaseModel):
    id: int
    room_id: int
    status: str
    deck_seed: int
    created_at: datetime
    ended_at: Optional[datetime]
    players: List[MatchPlayerInfo]
    
    class Config:
        from_attributes = True

