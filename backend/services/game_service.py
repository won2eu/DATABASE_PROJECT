import random
from sqlalchemy.orm import Session
from models.match import Match, MatchPlayer
from models.room import Room
from models.round import Round, RoundCard, Action
from models.enums import MatchStatus, RoundState, ActionType
from services.deck_service import DeckService

class GameService:
    """게임 핵심 로직 서비스"""
    
    @staticmethod
    def start_match(db: Session, room_id: int) -> Match:
        """매치 시작: 덱 생성, 플레이어 등록, 첫 라운드 시작"""
        # 방 확인
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise ValueError("방을 찾을 수 없습니다")
        
        if not room.player1_id or not room.player2_id:
            raise ValueError("방에 두 명의 플레이어가 필요합니다")
        
        # 매치 생성
        match = Match(
            room_id=room_id,
            status=MatchStatus.INIT,
            deck_seed=random.randint(1, 1000000),
            settings={}
        )
        db.add(match)
        db.flush()
        
        # 플레이어 등록 (방을 만든 사람이 seat 0, 선 플레이어)
        player1 = MatchPlayer(
            match_id=match.id,
            user_id=room.player1_id,
            seat=0,
            chips=30,
            is_bot=False
        )
        player2 = MatchPlayer(
            match_id=match.id,
            user_id=room.player2_id,
            seat=1,
            chips=30,
            is_bot=False
        )
        db.add(player1)
        db.add(player2)
        
        # 덱 생성 및 섞기
        DeckService.create_card_templates(db)
        DeckService.shuffle_deck(db, match)
        
        # 매치 상태를 ACTIVE로 변경
        match.status = MatchStatus.ACTIVE
        
        db.commit()
        return match
    
    @staticmethod
    def start_round(db: Session, match_id: int, round_no: int = None) -> Round:
        """라운드 시작: 딜링, 기본 베팅"""
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise ValueError("매치를 찾을 수 없습니다")
        
        # 라운드 번호 결정
        if round_no is None:
            last_round = db.query(Round).filter(
                Round.match_id == match_id
            ).order_by(Round.round_no.desc()).first()
            round_no = (last_round.round_no + 1) if last_round else 1
        
        # 이미 해당 라운드가 존재하는지 확인
        existing_round = db.query(Round).filter(
            Round.match_id == match_id,
            Round.round_no == round_no
        ).first()
        
        if existing_round:
            # 이미 존재하면 기존 라운드 반환
            return existing_round
        
        # 선 플레이어 결정 (첫 라운드는 방 만든 사람, 이후는 직전 라운드 승자)
        players = db.query(MatchPlayer).filter(MatchPlayer.match_id == match_id).all()
        player1 = next(p for p in players if p.seat == 0)
        player2 = next(p for p in players if p.seat == 1)
        
        if round_no == 1:
            first_player = player1  # 방을 만든 사람
        else:
            # 직전 라운드 승자 찾기
            prev_round = db.query(Round).filter(
                Round.match_id == match_id,
                Round.round_no == round_no - 1
            ).first()
            if prev_round and prev_round.winner_id:
                first_player = next(
                    (p for p in players if p.user_id == prev_round.winner_id),
                    player1
                )
            else:
                first_player = player1
        
        # 이전 라운드의 carry_over_pot 가져오기
        carry_over = 0
        if round_no > 1:
            prev_round = db.query(Round).filter(
                Round.match_id == match_id,
                Round.round_no == round_no - 1
            ).first()
            if prev_round:
                carry_over = prev_round.carry_over_pot
        
        # 라운드 생성
        round = Round(
            match_id=match_id,
            round_no=round_no,
            state=RoundState.DEALING,
            pot=carry_over,
            carry_over_pot=0,
            current_turn_user_id=first_player.user_id,
            min_bet=1
        )
        db.add(round)
        db.flush()
        
        # 카드 딜링
        front1, back1 = DeckService.deal_card(db, match, (round_no - 1) * 2 + 1)
        front2, back2 = DeckService.deal_card(db, match, (round_no - 1) * 2 + 2)
        
        card1 = RoundCard(
            round_id=round.id,
            player_id=player1.user_id,
            front_value=front1,
            back_value=back1,
            chosen_side=None
        )
        card2 = RoundCard(
            round_id=round.id,
            player_id=player2.user_id,
            front_value=front2,
            back_value=back2,
            chosen_side=None
        )
        db.add(card1)
        db.add(card2)
        
        # 기본 베팅 (각 플레이어 1칩)
        player1.chips -= 1
        player2.chips -= 1
        round.pot += 2
        
        # 기본 베팅 액션 기록
        action1 = Action(
            round_id=round.id,
            player_id=player1.user_id,
            action_type=ActionType.BET,
            amount=1,
            payload={}
        )
        action2 = Action(
            round_id=round.id,
            player_id=player2.user_id,
            action_type=ActionType.BET,
            amount=1,
            payload={}
        )
        db.add(action1)
        db.add(action2)
        
        # 상태를 SIDE_SELECTION으로 변경
        round.state = RoundState.SIDE_SELECTION
        
        db.commit()
        return round
    
    @staticmethod
    def select_side(db: Session, round_id: int, player_id: int, side: str):
        """베팅 면 선택 (두 플레이어 모두 선택)"""
        round = db.query(Round).filter(Round.id == round_id).first()
        if not round:
            raise ValueError("라운드를 찾을 수 없습니다")
        
        if round.state != RoundState.SIDE_SELECTION:
            raise ValueError("면 선택 단계가 아닙니다")
        
        # 플레이어의 카드 찾기
        card = db.query(RoundCard).filter(
            RoundCard.round_id == round_id,
            RoundCard.player_id == player_id
        ).first()
        
        if not card:
            raise ValueError("플레이어의 카드를 찾을 수 없습니다")
        
        # 면 선택
        if side not in ["front", "back", "double_side"]:
            raise ValueError("잘못된 면 선택입니다")
        
        card.chosen_side = side
        
        # 액션 기록
        action = Action(
            round_id=round_id,
            player_id=player_id,
            action_type=ActionType.SELECT_SIDE,
            amount=None,
            payload={"side": side}
        )
        db.add(action)
        
        # 두 플레이어 모두 선택했는지 확인
        cards = db.query(RoundCard).filter(RoundCard.round_id == round_id).all()
        all_selected = all(c.chosen_side for c in cards)
        
        if all_selected:
            # 양면베팅 여부 확인
            has_double_side = any(c.chosen_side == "double_side" for c in cards)
            round.is_double_side_bet = has_double_side
            
            # 베팅 단계로 전환
            round.state = RoundState.BETTING
        
        db.commit()
        return round
