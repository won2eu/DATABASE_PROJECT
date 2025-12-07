from sqlalchemy.orm import Session
from typing import Optional
from models.round import Round, Action, RoundCard
from models.match import MatchPlayer, Match
from models.enums import RoundState, ActionType, RoundResult, MatchStatus
from datetime import datetime
from services.game_service import GameService

class BettingService:
    """베팅 로직 서비스"""
    
    @staticmethod
    def get_current_bet_amount(db: Session, round_id: int) -> int:
        """현재 라운드의 최대 베팅 금액 반환"""
        actions = db.query(Action).filter(
            Action.round_id == round_id,
            Action.action_type.in_(["bet", "raise"])
        ).order_by(Action.created_at.desc()).all()
        
        if not actions:
            return 0
        
        max_amount = 0
        for action in actions:
            if action.amount and action.amount > max_amount:
                max_amount = action.amount
        
        return max_amount
    
    @staticmethod
    def get_player_bet_total(db: Session, round_id: int, player_id: int) -> int:
        """플레이어가 이번 라운드에 베팅한 총 금액"""
        actions = db.query(Action).filter(
            Action.round_id == round_id,
            Action.player_id == player_id,
            Action.action_type.in_(["bet", "raise", "call"])
        ).all()
        
        total = sum(action.amount for action in actions if action.amount)
        return total
    
    @staticmethod
    def is_double_side_bet(db: Session, round_id: int, player_id: int) -> bool:
        """플레이어가 양면베팅을 선택했는지 확인"""
        card = db.query(RoundCard).filter(
            RoundCard.round_id == round_id,
            RoundCard.player_id == player_id
        ).first()
        
        return card and card.chosen_side == "double_side"
    
    @staticmethod
    def calculate_actual_cost(amount: int, is_double_side: bool) -> int:
        """양면베팅 시 실제 소모 칩 계산 (×2)"""
        return amount * 2 if is_double_side else amount
    
    @staticmethod
    def process_action(
        db: Session, 
        round_id: int, 
        player_id: int, 
        action_type: str, 
        amount: Optional[int] = None
    ) -> Round:
        """베팅 액션 처리"""
        round = db.query(Round).filter(Round.id == round_id).first()
        if not round:
            raise ValueError("라운드를 찾을 수 없습니다")
        
        if round.state != RoundState.BETTING:
            raise ValueError("베팅 단계가 아닙니다")
        
        if round.current_turn_user_id != player_id:
            raise ValueError("현재 턴이 아닙니다")
        
        # 플레이어 정보
        match = db.query(Match).filter(Match.id == round.match_id).first()
        if not match:
            raise ValueError("매치를 찾을 수 없습니다")
        
        match_player = db.query(MatchPlayer).filter(
            MatchPlayer.match_id == match.id,
            MatchPlayer.user_id == player_id
        ).first()
        
        if not match_player:
            raise ValueError("플레이어를 찾을 수 없습니다")
        
        # 양면베팅 여부 확인
        is_double_side = BettingService.is_double_side_bet(db, round_id, player_id)
        
        # 현재 베팅 상태 확인
        players = db.query(MatchPlayer).filter(MatchPlayer.match_id == match.id).all()
        other_player = next(p for p in players if p.user_id != player_id)
        
        player_bet_total = BettingService.get_player_bet_total(db, round_id, player_id)
        other_bet_total = BettingService.get_player_bet_total(db, round_id, other_player.user_id)
        
        # 액션 처리
        if action_type == "fold":
            # 폴드 처리
            action = Action(
                round_id=round_id,
                player_id=player_id,
                action_type=ActionType.FOLD,
                amount=None,
                payload={}
            )
            db.add(action)
            
            # 양면베팅 특수 규칙: 상대방이 양면베팅했고 내가 폴드하면 상대방에게 10칩 지급
            other_is_double = BettingService.is_double_side_bet(db, round_id, other_player.user_id)
            if other_is_double:
                match_player.chips -= 10
                other_player.chips += 10
                round.double_side_bonus = -10  # 폴드한 플레이어 입장에서 -10
            
            # 라운드 종료
            round.state = RoundState.ENDED
            round.result = RoundResult.PLAYER1_FOLD if player_id == players[0].user_id else RoundResult.PLAYER2_FOLD
            round.winner_id = other_player.user_id
            round.ended_at = datetime.now()
            
            # 승자에게 pot 지급
            other_player.chips += round.pot
            round.pot = 0
            
            # 다음 턴 설정 (없음)
            round.current_turn_user_id = None
            
        elif action_type in ["bet", "raise"]:
            if amount is None:
                raise ValueError("베팅 금액이 필요합니다")
            
            # amount는 총 베팅 금액이므로, 추가로 베팅할 금액 계산
            additional_bet = amount - player_bet_total
            
            if additional_bet <= 0:
                raise ValueError("베팅 금액이 현재 베팅 금액보다 높아야 합니다")
            
            # 양면베팅 시 실제 소모 칩 계산 (추가 베팅 금액 기준)
            actual_cost = BettingService.calculate_actual_cost(additional_bet, is_double_side)
            
            # 칩 확인
            if match_player.chips < actual_cost:
                raise ValueError("칩이 부족합니다")
            
            # 베팅 금액이 상대방보다 높아야 함
            if amount <= other_bet_total:
                raise ValueError("상대방보다 높은 금액을 베팅해야 합니다")
            
            # 베팅 처리
            match_player.chips -= actual_cost
            round.pot += actual_cost
            
            action = Action(
                round_id=round_id,
                player_id=player_id,
                action_type=ActionType.RAISE if other_bet_total > 0 else ActionType.BET,
                amount=amount,
                payload={}
            )
            db.add(action)
            
            # 다음 턴으로
            round.current_turn_user_id = other_player.user_id
        
        elif action_type == "call":
            # 콜: 상대방과 같은 금액 베팅
            call_amount = other_bet_total - player_bet_total
            
            if call_amount <= 0:
                raise ValueError("이미 같은 금액을 베팅했습니다")
            
            # 양면베팅 시 실제 소모 칩 계산
            actual_cost = BettingService.calculate_actual_cost(call_amount, is_double_side)
            
            # 칩 확인
            if match_player.chips < actual_cost:
                raise ValueError("칩이 부족합니다")
            
            # 콜 처리
            match_player.chips -= actual_cost
            round.pot += actual_cost
            
            action = Action(
                round_id=round_id,
                player_id=player_id,
                action_type=ActionType.CALL,
                amount=call_amount,
                payload={}
            )
            db.add(action)
            
            # 베팅 종료, 카드 공개
            round.state = RoundState.REVEAL
            round.current_turn_user_id = None
            
            # 결과 판정
            BettingService.determine_winner(db, round)
        
        else:
            raise ValueError(f"지원하지 않는 액션: {action_type}")
        
        # 모든 변경사항을 atomic하게 커밋
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise ValueError(f"베팅 처리 중 오류 발생: {str(e)}")
        
        return round
    
    @staticmethod
    def determine_winner(db: Session, round: Round):
        """라운드 결과 판정"""
        cards = db.query(RoundCard).filter(RoundCard.round_id == round.id).all()
        if len(cards) != 2:
            raise ValueError("카드가 2장이 아닙니다")
        
        card1, card2 = cards
        players = db.query(MatchPlayer).filter(MatchPlayer.match_id == round.match_id).all()
        player1 = next(p for p in players if p.user_id == card1.player_id)
        player2 = next(p for p in players if p.user_id == card2.player_id)
        
        side1 = card1.chosen_side
        side2 = card2.chosen_side
        
        # 양면베팅 판정
        if side1 == "double_side" and side2 == "double_side":
            # 둘 다 양면베팅
            value1_front = card1.front_value
            value1_back = card1.back_value
            value2_front = card2.front_value
            value2_back = card2.back_value
            
            # 플레이어1이 이기려면: 앞면과 뒷면 모두 플레이어2의 앞면과 뒷면보다 높아야 함
            player1_wins = (value1_front > value2_front and value1_front > value2_back and
                          value1_back > value2_front and value1_back > value2_back)
            player2_wins = (value2_front > value1_front and value2_front > value1_back and
                          value2_back > value1_front and value2_back > value1_back)
            
            if player1_wins:
                round.result = RoundResult.PLAYER1_WIN
                round.winner_id = player1.user_id
                player1.chips += round.pot
                round.pot = 0
            elif player2_wins:
                round.result = RoundResult.PLAYER2_WIN
                round.winner_id = player2.user_id
                player2.chips += round.pot
                round.pot = 0
            else:
                # 무승부
                round.result = RoundResult.TIE
                round.winner_id = None
                round.carry_over_pot = round.pot
                round.pot = 0
        
        elif side1 == "double_side":
            # 플레이어1만 양면베팅
            value1_front = card1.front_value
            value1_back = card1.back_value
            value2 = card2.front_value if side2 == "front" else card2.back_value
            
            # 플레이어1이 이기려면: 앞면과 뒷면 모두 value2보다 높아야 함
            player1_wins = value1_front > value2 and value1_back > value2
            
            if player1_wins:
                round.result = RoundResult.PLAYER1_WIN
                round.winner_id = player1.user_id
                player1.chips += round.pot + 10  # 보너스 10칩
                round.double_side_bonus = 10
                round.pot = 0
            else:
                round.result = RoundResult.PLAYER2_WIN
                round.winner_id = player2.user_id
                player2.chips += round.pot
                round.pot = 0
        
        elif side2 == "double_side":
            # 플레이어2만 양면베팅
            value1 = card1.front_value if side1 == "front" else card1.back_value
            value2_front = card2.front_value
            value2_back = card2.back_value
            
            # 플레이어2가 이기려면: 앞면과 뒷면 모두 value1보다 높아야 함
            player2_wins = value2_front > value1 and value2_back > value1
            
            if player2_wins:
                round.result = RoundResult.PLAYER2_WIN
                round.winner_id = player2.user_id
                player2.chips += round.pot + 10  # 보너스 10칩
                round.double_side_bonus = 10
                round.pot = 0
            else:
                round.result = RoundResult.PLAYER1_WIN
                round.winner_id = player1.user_id
                player1.chips += round.pot
                round.pot = 0
        
        else:
            # 둘 다 일반 베팅
            value1 = card1.front_value if side1 == "front" else card1.back_value
            value2 = card2.front_value if side2 == "front" else card2.back_value
            
            if value1 > value2:
                round.result = RoundResult.PLAYER1_WIN
                round.winner_id = player1.user_id
                player1.chips += round.pot
                round.pot = 0
            elif value2 > value1:
                round.result = RoundResult.PLAYER2_WIN
                round.winner_id = player2.user_id
                player2.chips += round.pot
                round.pot = 0
            else:
                # 무승부
                round.result = RoundResult.TIE
                round.winner_id = None
                round.carry_over_pot = round.pot
                round.pot = 0
        
        round.state = RoundState.ENDED
        round.ended_at = datetime.now()
        
        # 게임 종료 확인 (한 플레이어의 칩이 0이 되면)
        match = db.query(Match).filter(Match.id == round.match_id).first()
        if match:
            if player1.chips <= 0:
                match.status = MatchStatus.ENDED
                match.ended_at = datetime.now()
            elif player2.chips <= 0:
                match.status = MatchStatus.ENDED
                match.ended_at = datetime.now()
