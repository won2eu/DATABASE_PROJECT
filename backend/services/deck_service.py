import random
from sqlalchemy.orm import Session
from models.match import Match
from models.deck import CardTemplate, DeckInstance

class DeckService:
    """덱 생성 및 섞기 서비스"""
    
    @staticmethod
    def create_card_templates(db: Session):
        """카드 템플릿 생성 (1-9 범위, 한 면이 짝수면 다른 면은 홀수)"""
        # 이미 생성되어 있는지 확인
        existing = db.query(CardTemplate).first()
        if existing:
            return
        
        # 1-9 범위의 카드 생성
        # 한 면이 짝수면 다른 면은 홀수로 구성
        cards = []
        
        # 앞면 짝수, 뒷면 홀수 조합
        for front in range(2, 10, 2):  # 2, 4, 6, 8
            for back in range(1, 10, 2):  # 1, 3, 5, 7, 9
                cards.append((front, back))
        
        # 앞면 홀수, 뒷면 짝수 조합
        for front in range(1, 10, 2):  # 1, 3, 5, 7, 9
            for back in range(2, 10, 2):  # 2, 4, 6, 8
                cards.append((front, back))
        
        # 카드 템플릿 생성
        for front, back in cards:
            template = CardTemplate(
                front_value=front,
                back_value=back,
                copies=1
            )
            db.add(template)
        
        db.commit()
    
    @staticmethod
    def shuffle_deck(db: Session, match: Match):
        """덱을 섞어서 DeckInstance 생성"""
        # 기존 덱 인스턴스가 있으면 삭제 (재섞기)
        db.query(DeckInstance).filter(DeckInstance.match_id == match.id).delete()
        
        # 카드 템플릿 가져오기
        templates = db.query(CardTemplate).all()
        if not templates:
            DeckService.create_card_templates(db)
            templates = db.query(CardTemplate).all()
        
        # 모든 카드 템플릿을 리스트로 만들기
        deck = []
        for template in templates:
            for _ in range(template.copies):
                deck.append(template.id)
        
        # 덱 섞기
        random.seed(match.deck_seed)
        random.shuffle(deck)
        
        # DeckInstance 생성
        for order_no, template_id in enumerate(deck, start=1):
            instance = DeckInstance(
                match_id=match.id,
                card_template_id=template_id,
                order_no=order_no
            )
            db.add(instance)
        
        db.commit()
    
    @staticmethod
    def deal_card(db: Session, match: Match, deck_position: int) -> tuple[int, int]:
        """덱에서 카드 한 장을 딜링 (front_value, back_value 반환)"""
        # deck_position은 1부터 시작
        instance = db.query(DeckInstance).filter(
            DeckInstance.match_id == match.id,
            DeckInstance.order_no == deck_position
        ).first()
        
        if not instance:
            # 덱이 소진되었으면 다시 섞기
            max_order = db.query(DeckInstance).filter(
                DeckInstance.match_id == match.id
            ).with_entities(DeckInstance.order_no).order_by(DeckInstance.order_no.desc()).first()
            
            if max_order:
                # 이미 사용한 카드들 제거하고 재섞기
                db.query(DeckInstance).filter(DeckInstance.match_id == match.id).delete()
                # 새로운 시드로 재섞기
                match.deck_seed = random.randint(1, 1000000)
                DeckService.shuffle_deck(db, match)
                instance = db.query(DeckInstance).filter(
                    DeckInstance.match_id == match.id,
                    DeckInstance.order_no == 1
                ).first()
            else:
                raise ValueError("덱을 찾을 수 없습니다")
        
        template = instance.card_template
        return (template.front_value, template.back_value)
    
    @staticmethod
    def get_remaining_cards(db: Session, match: Match) -> int:
        """남은 카드 수 반환"""
        total = db.query(DeckInstance).filter(DeckInstance.match_id == match.id).count()
        return total
