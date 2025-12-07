from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.match import Match, MatchPlayer
from models.enums import MatchStatus
from schemas.match import MatchStart, MatchResponse
from services.game_service import GameService

router = APIRouter(prefix="/api/matches", tags=["matches"])

@router.post("", response_model=MatchResponse)
def start_match(match_data: MatchStart, db: Session = Depends(get_db)):
    """매치 시작"""
    try:
        match = GameService.start_match(db, match_data.room_id)
        
        players = db.query(MatchPlayer).filter(
            MatchPlayer.match_id == match.id
        ).all()
        
        return MatchResponse(
            id=match.id,
            room_id=match.room_id,
            status=match.status,
            deck_seed=match.deck_seed,
            created_at=match.created_at,
            ended_at=match.ended_at,
            players=[
                {
                    "user_id": p.user_id,
                    "username": p.user.username,
                    "seat": p.seat,
                    "chips": p.chips,
                    "is_bot": p.is_bot
                }
                for p in players
            ]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"매치 시작 실패: {str(e)}")

@router.get("/room/{room_id}", response_model=MatchResponse)
def get_match_by_room(room_id: int, db: Session = Depends(get_db)):
    """룸 ID로 매치 정보 조회"""
    match = db.query(Match).filter(
        Match.room_id == room_id,
        Match.status == MatchStatus.ACTIVE
    ).order_by(Match.created_at.desc()).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="활성 매치를 찾을 수 없습니다")
    
    players = db.query(MatchPlayer).filter(
        MatchPlayer.match_id == match.id
    ).all()
    
    return MatchResponse(
        id=match.id,
        room_id=match.room_id,
        status=match.status,
        deck_seed=match.deck_seed,
        created_at=match.created_at,
        ended_at=match.ended_at,
        players=[
            {
                "user_id": p.user_id,
                "username": p.user.username,
                "seat": p.seat,
                "chips": p.chips,
                "is_bot": p.is_bot
            }
            for p in players
        ]
    )

@router.get("/{match_id}", response_model=MatchResponse)
def get_match(match_id: int, db: Session = Depends(get_db)):
    """매치 정보 조회"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="매치를 찾을 수 없습니다")
    
    players = db.query(MatchPlayer).filter(
        MatchPlayer.match_id == match_id
    ).all()
    
    return MatchResponse(
        id=match.id,
        room_id=match.room_id,
        status=match.status,
        deck_seed=match.deck_seed,
        created_at=match.created_at,
        ended_at=match.ended_at,
        players=[
            {
                "user_id": p.user_id,
                "username": p.user.username,
                "seat": p.seat,
                "chips": p.chips,
                "is_bot": p.is_bot
            }
            for p in players
        ]
    )

