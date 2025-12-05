from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class RoomCreate(BaseModel):
    player1_id: int

class RoomJoin(BaseModel):
    player2_id: int

class RoomResponse(BaseModel):
    id: int
    invite_code: str
    status: str
    player1_id: Optional[int]
    player2_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

