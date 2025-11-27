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
    BETTING = "betting"
    REVEAL = "reveal"
    ENDED = "ended"

class ActionType(str, Enum):
    BET = "bet"
    CALL = "call"
    RAISE = "raise"
    FOLD = "fold"
    DOUBLE_SIDE = "double_side"
    REVEAL = "reveal"
    TIMEOUT = "timeout"

class CardSide(str, Enum):
    FRONT = "front"
    BACK = "back"

