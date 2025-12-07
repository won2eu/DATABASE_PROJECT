from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.round import Round, RoundCard, Action
from models.match import Match
from schemas.round import RoundResponse, SideSelectionRequest, ActionRequest, ActionResponse
from services.game_service import GameService
from services.betting_service import BettingService

router = APIRouter(prefix="/api/rounds", tags=["rounds"])

@router.post("/{match_id}/start", response_model=RoundResponse)
def start_round(match_id: int, db: Session = Depends(get_db)):
    """라운드 시작 (딜링, 기본 베팅)"""
    try:
        round = GameService.start_round(db, match_id)
        return _build_round_response(db, round)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"라운드 시작 실패: {str(e)}")

@router.post("/{round_id}/select-side", response_model=RoundResponse)
def select_side(round_id: int, request: SideSelectionRequest, db: Session = Depends(get_db)):
    """베팅 면 선택"""
    try:
        round = GameService.select_side(db, round_id, request.player_id, request.side)
        return _build_round_response(db, round)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"면 선택 실패: {str(e)}")

@router.post("/{round_id}/action", response_model=ActionResponse)
def perform_action(round_id: int, request: ActionRequest, db: Session = Depends(get_db)):
    """베팅 액션 수행 (트랜잭션 처리)"""
    try:
        round = BettingService.process_action(
            db, 
            round_id, 
            request.player_id, 
            request.action_type, 
            request.amount
        )
        return ActionResponse(
            success=True,
            message="액션이 성공적으로 처리되었습니다",
            round=_build_round_response(db, round)
        )
    except ValueError as e:
        # 예외 발생 시 롤백
        db.rollback()
        return ActionResponse(
            success=False,
            message=str(e),
            round=None
        )
    except Exception as e:
        # 예외 발생 시 롤백
        db.rollback()
        return ActionResponse(
            success=False,
            message=f"액션 처리 실패: {str(e)}",
            round=None
        )

@router.get("/match/{match_id}/current", response_model=RoundResponse)
def get_current_round(match_id: int, db: Session = Depends(get_db)):
    """매치의 현재 라운드 정보 조회"""
    round = db.query(Round).filter(
        Round.match_id == match_id
    ).order_by(Round.round_no.desc()).first()
    
    if not round:
        raise HTTPException(status_code=404, detail="라운드를 찾을 수 없습니다")
    
    return _build_round_response(db, round)

@router.get("/{round_id}", response_model=RoundResponse)
def get_round(round_id: int, db: Session = Depends(get_db)):
    """라운드 정보 조회"""
    round = db.query(Round).filter(Round.id == round_id).first()
    if not round:
        raise HTTPException(status_code=404, detail="라운드를 찾을 수 없습니다")
    
    return _build_round_response(db, round)

def _build_round_response(db: Session, round: Round) -> RoundResponse:
    """Round 객체를 RoundResponse로 변환"""
    cards = db.query(RoundCard).filter(RoundCard.round_id == round.id).all()
    actions = db.query(Action).filter(Action.round_id == round.id).order_by(Action.created_at).all()
    
    return RoundResponse(
        id=round.id,
        match_id=round.match_id,
        round_no=round.round_no,
        state=round.state,
        pot=round.pot,
        carry_over_pot=round.carry_over_pot,
        current_turn_user_id=round.current_turn_user_id,
        min_bet=round.min_bet,
        result=round.result,
        winner_id=round.winner_id,
        is_double_side_bet=round.is_double_side_bet,
        double_side_bonus=round.double_side_bonus,
        created_at=round.created_at,
        ended_at=round.ended_at,
        cards=[
            {
                "player_id": c.player_id,
                "front_value": c.front_value,
                "back_value": c.back_value,
                "chosen_side": c.chosen_side
            }
            for c in cards
        ],
        actions=[
            {
                "id": a.id,
                "player_id": a.player_id,
                "action_type": a.action_type,
                "amount": a.amount,
                "created_at": a.created_at
            }
            for a in actions
        ]
    )

