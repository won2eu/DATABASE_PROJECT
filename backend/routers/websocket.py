from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from models.room import Room
from services.websocket_manager import manager

router = APIRouter()

@router.websocket("/ws/room/{room_id}/user/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int, user_id: int):
    """룸 웹소켓 연결"""
    from database import SessionLocal
    
    # 룸 확인
    db = SessionLocal()
    try:
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            await websocket.close(code=1008, reason="룸을 찾을 수 없습니다")
            return
        
        # 룸에 참가한 플레이어인지 확인
        if room.player1_id != user_id and room.player2_id != user_id:
            await websocket.close(code=1008, reason="이 룸에 참가한 플레이어가 아닙니다")
            return
        
        # 연결
        await manager.connect(websocket, room_id, user_id)
        
        # 연결 성공 메시지
        await manager.send_personal_message({
            "type": "connected",
            "room_id": room_id,
            "user_id": user_id
        }, websocket)
        
        # 룸의 다른 플레이어에게 연결 알림
        await manager.broadcast_to_room(room_id, {
            "type": "player_connected",
            "user_id": user_id
        }, exclude_user_id=user_id)
        
        # 두 플레이어가 모두 연결되었는지 확인
        if room.player1_id and room.player2_id:
            both_connected = manager.is_both_players_connected(
                room_id, room.player1_id, room.player2_id
            )
            
            if both_connected:
                # 두 플레이어 모두 연결됨
                await manager.broadcast_to_room(room_id, {
                    "type": "both_players_ready",
                    "message": "두 플레이어가 모두 준비되었습니다"
                })
        
        # 메시지 수신 루프
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "ping":
                # 핑 응답
                await manager.send_personal_message({
                    "type": "pong"
                }, websocket)
            
            
            else:
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"알 수 없는 메시지 타입: {message_type}"
                }, websocket)
    
    except WebSocketDisconnect:
        db.rollback()
        manager.disconnect(websocket, room_id, user_id)
        # 다른 플레이어에게 연결 해제 알림
        try:
            await manager.broadcast_to_room(room_id, {
                "type": "player_disconnected",
                "user_id": user_id
            }, exclude_user_id=user_id)
        except:
            pass
    except Exception as e:
        db.rollback()
        print(f"웹소켓 오류: {e}")
        manager.disconnect(websocket, room_id, user_id)
    finally:
        db.close()

