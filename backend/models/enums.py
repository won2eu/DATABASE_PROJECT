from enum import Enum

class RoomStatus(str, Enum):
    OPEN = "open"
    PLAYING = "playing"
    CLOSED = "closed"

class MatchStatus(str, Enum):
    INIT = "init"
    ACTIVE = "active"
    ENDED = "ended"

class RoundState(str, Enum):
    DEALING = "dealing"
    SIDE_SELECTION = "side_selection"  # 베팅 면 선택 단계
    BETTING = "betting"
    REVEAL = "reveal"
    ENDED = "ended"

class ActionType(str, Enum):
    BET = "bet"
    CALL = "call"
    RAISE = "raise"
    FOLD = "fold"
    CHECK = "check"  # 추가 베팅 없이 턴 넘기기
    DOUBLE_SIDE = "double_side"
    SELECT_SIDE = "select_side"  # 면 선택
    REVEAL = "reveal"
    TIMEOUT = "timeout"

class CardSide(str, Enum):
    FRONT = "front"
    BACK = "back"

class RoundResult(str, Enum):
    PLAYER1_WIN = "player1_win"
    PLAYER2_WIN = "player2_win"
    TIE = "tie"  # 무승부
    PLAYER1_FOLD = "player1_fold"
    PLAYER2_FOLD = "player2_fold"

