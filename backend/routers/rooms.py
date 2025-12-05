from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.room import Room
from models.user import User
from models.enums import RoomStatus
from schemas.room import RoomCreate, RoomJoin, RoomResponse
from services.game_service import GameService
import secrets

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

@router.post("", response_model=RoomResponse)
def create_room(room_data: RoomCreate, db: Session = Depends(get_db)):
    """룸 생성"""
    # 플레이어 확인
    player = db.query(User).filter(User.id == room_data.player1_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="플레이어를 찾을 수 없습니다")
    
    # 초대 코드 생성
    invite_code = secrets.token_urlsafe(8)[:16]
    
    # 룸 생성
    room = Room(
        invite_code=invite_code,
        status=RoomStatus.OPEN,
        player1_id=room_data.player1_id,
        player2_id=None
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    
    return room

@router.post("/{room_id}/join", response_model=RoomResponse)
def join_room(room_id: int, join_data: RoomJoin, db: Session = Depends(get_db)):
    """룸 참가"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="룸을 찾을 수 없습니다")
    
    if room.status != RoomStatus.OPEN:
        raise HTTPException(status_code=400, detail="참가할 수 없는 룸입니다")
    
    if room.player1_id == join_data.player2_id:
        raise HTTPException(status_code=400, detail="이미 룸에 참가한 플레이어입니다")
    
    if room.player2_id:
        raise HTTPException(status_code=400, detail="룸이 이미 가득 찼습니다")
    
    # 플레이어 확인
    player = db.query(User).filter(User.id == join_data.player2_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="플레이어를 찾을 수 없습니다")
    
    room.player2_id = join_data.player2_id
    
    # 두 플레이어가 모두 참가했으면 자동으로 매치 시작 및 첫 라운드 시작
    if room.player1_id and room.player2_id:
        try:
            # 매치 시작
            match = GameService.start_match(db, room.id)
            # 첫 라운드 시작
            GameService.start_round(db, match.id, round_no=1)
            # 룸 상태를 PLAYING으로 변경
            room.status = RoomStatus.PLAYING
        except Exception as e:
            # 매치 시작 실패 시 에러 반환
            raise HTTPException(status_code=500, detail=f"게임 시작 실패: {str(e)}")
    
    db.commit()
    db.refresh(room)
    
    return room

@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: int, db: Session = Depends(get_db)):
    """룸 정보 조회"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="룸을 찾을 수 없습니다")
    
    return room

