from typing import Dict, Set
from fastapi import WebSocket
import json

class ConnectionManager:
    """웹소켓 연결 관리자"""
    
    def __init__(self):
        # room_id -> Set[WebSocket] 매핑
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # user_id -> WebSocket 매핑
        self.user_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, room_id: int, user_id: int):
        """웹소켓 연결"""
        await websocket.accept()
        
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        
        self.active_connections[room_id].add(websocket)
        self.user_connections[user_id] = websocket
    
    def disconnect(self, websocket: WebSocket, room_id: int, user_id: int):
        """웹소켓 연결 해제"""
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        
        if user_id in self.user_connections:
            del self.user_connections[user_id]
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """개인 메시지 전송"""
        await websocket.send_json(message)
    
    async def broadcast_to_room(self, room_id: int, message: dict, exclude_user_id: int = None):
        """룸 내 모든 플레이어에게 브로드캐스트"""
        if room_id not in self.active_connections:
            return
        
        disconnected = set()
        for websocket in self.active_connections[room_id]:
            try:
                # 특정 사용자 제외
                if exclude_user_id:
                    user_ws = self.user_connections.get(exclude_user_id)
                    if websocket == user_ws:
                        continue
                
                await websocket.send_json(message)
            except Exception as e:
                print(f"웹소켓 전송 오류: {e}")
                disconnected.add(websocket)
        
        # 연결이 끊어진 웹소켓 제거
        for ws in disconnected:
            self.active_connections[room_id].discard(ws)
    
    def get_connected_users(self, room_id: int) -> list[int]:
        """룸에 연결된 사용자 ID 목록 반환"""
        if room_id not in self.active_connections:
            return []
        
        connected_users = []
        for user_id, ws in self.user_connections.items():
            if ws in self.active_connections[room_id]:
                connected_users.append(user_id)
        
        return connected_users
    
    def is_both_players_connected(self, room_id: int, player1_id: int, player2_id: int) -> bool:
        """두 플레이어가 모두 연결되었는지 확인"""
        connected = self.get_connected_users(room_id)
        return player1_id in connected and player2_id in connected
    
    async def send_to_user(self, user_id: int, message: dict):
        """특정 사용자에게 메시지 전송"""
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(message)
            except Exception as e:
                print(f"사용자 {user_id}에게 메시지 전송 실패: {e}")

# 전역 연결 관리자
manager = ConnectionManager()

