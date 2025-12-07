'use client';

import { useState, useEffect } from 'react';

interface LobbyProps {
  onStartGame: (userId: number, roomId: number) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Lobby({ onStartGame }: LobbyProps) {
  const [step, setStep] = useState<'username' | 'createOrJoin' | 'joinRoom' | 'roomCreated'>('username');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 방 생성 후 매치 시작 대기 (player1용)
  useEffect(() => {
    if (step === 'roomCreated' && roomId && userId) {
      const checkMatchInterval = setInterval(async () => {
        try {
          const matchResponse = await fetch(`${API_URL}/api/matches/room/${roomId}`);
          if (matchResponse.ok) {
            // 매치가 시작되었으면 게임 시작
            clearInterval(checkMatchInterval);
            onStartGame(userId, roomId);
          }
        } catch (error) {
          console.error('매치 확인 실패:', error);
        }
      }, 1000); // 1초마다 확인

      return () => clearInterval(checkMatchInterval);
    }
  }, [step, roomId, userId, onStartGame]);

  // 사용자 생성
  const handleCreateUser = async () => {
    if (!username.trim()) {
      setError('사용자 이름을 입력해주세요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '사용자 생성 실패');
      }

      const user = await response.json();
      setUserId(user.id);
      setStep('createOrJoin');
    } catch (err: any) {
      setError(err.message || '사용자 생성 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 게스트로 시작
  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // 게스트 이름 자동 생성 (Guest_랜덤숫자)
      const guestUsername = `Guest_${Math.floor(Math.random() * 10000)}`;
      
      const response = await fetch(`${API_URL}/api/users/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: guestUsername }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '게스트 로그인 실패');
      }

      const user = await response.json();
      setUserId(user.id);
      setUsername(user.username);
      // 게스트는 방 생성 불가능하므로 바로 참가 화면으로
      setStep('joinRoom');
    } catch (err: any) {
      setError(err.message || '게스트 로그인 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 로그인
  const handleLogin = async () => {
    if (!username.trim()) {
      setError('사용자 이름을 입력해주세요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '로그인 실패');
      }

      const user = await response.json();
      setUserId(user.id);
      setStep('createOrJoin');
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 룸 생성
  const handleCreateRoom = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ player1_id: userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '룸 생성 실패');
      }

      const room = await response.json();
      setRoomId(room.id);
      setInviteCode(room.invite_code || room.id.toString());
      
      // 룸 생성 후 룸 ID 표시 화면으로 이동
      setStep('roomCreated');
    } catch (err: any) {
      setError(err.message || '룸 생성 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 룸 참가
  const handleJoinRoom = async () => {
    if (!userId || !inviteCode.trim()) {
      setError('초대 코드를 입력해주세요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 먼저 초대 코드로 룸 찾기 (간단하게 room_id를 직접 입력받거나, 초대 코드 검색 API가 필요)
      // 임시로 room_id를 직접 입력받도록 함
      const roomIdToJoin = parseInt(inviteCode);
      
      if (isNaN(roomIdToJoin)) {
        throw new Error('올바른 룸 ID를 입력해주세요');
      }

      const response = await fetch(`${API_URL}/api/rooms/${roomIdToJoin}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ player2_id: userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '룸 참가 실패');
      }

      const room = await response.json();
      setRoomId(room.id);
      
      // 룸 참가 후 게임 시작
      onStartGame(userId, room.id);
    } catch (err: any) {
      setError(err.message || '룸 참가 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
      }}
    >
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '24px',
          padding: '60px',
          border: '4px solid rgba(255, 215, 0, 1)',
          boxShadow: '0 12px 48px rgba(255, 215, 0, 0.3)',
          maxWidth: '500px',
          width: '90%',
        }}
      >
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            marginBottom: '40px',
            textAlign: 'center',
            color: 'rgba(255, 215, 0, 1)',
            textShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
          }}
        >
          양면 포커 게임
        </h1>

        {step === 'username' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                }}
              >
                사용자 이름
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading && username.trim()) {
                    handleLogin();
                  }
                }}
                placeholder="이름을 입력하세요"
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '18px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  outline: 'none',
                }}
                disabled={loading}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleLogin}
                  disabled={loading || !username.trim()}
                  style={{
                    flex: 1,
                    padding: '16px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    background: loading || !username.trim()
                      ? 'rgba(60, 60, 60, 0.7)'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%)',
                    color: '#ffffff',
                    border: '2px solid rgba(59, 130, 246, 0.8)',
                    borderRadius: '12px',
                    cursor: loading || !username.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !username.trim() ? 0.5 : 1,
                    transition: 'all 0.3s',
                  }}
                >
                  {loading ? '처리 중...' : '로그인'}
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={loading || !username.trim()}
                  style={{
                    flex: 1,
                    padding: '16px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    background: loading || !username.trim()
                      ? 'rgba(60, 60, 60, 0.7)'
                      : 'linear-gradient(135deg, rgba(13, 93, 31, 0.95) 0%, rgba(26, 122, 46, 0.95) 100%)',
                    color: 'rgba(255, 215, 0, 1)',
                    border: '2px solid rgba(255, 215, 0, 0.8)',
                    borderRadius: '12px',
                    cursor: loading || !username.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !username.trim() ? 0.5 : 1,
                    transition: 'all 0.3s',
                  }}
                >
                  {loading ? '처리 중...' : '회원가입'}
                </button>
              </div>
              <button
                onClick={handleGuestLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: loading
                    ? 'rgba(60, 60, 60, 0.7)'
                    : 'linear-gradient(135deg, rgba(168, 85, 247, 0.95) 0%, rgba(147, 51, 234, 0.95) 100%)',
                  color: '#ffffff',
                  border: '2px solid rgba(168, 85, 247, 0.8)',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.3s',
                }}
              >
                {loading ? '처리 중...' : '👤 게스트로 시작하기 (방 참가만 가능)'}
              </button>
            </div>
          </div>
        )}

        {step === 'createOrJoin' && (
          <div>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>
                안녕하세요, <strong>{username}</strong>님!
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '20px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  background: loading
                    ? 'rgba(60, 60, 60, 0.7)'
                    : 'linear-gradient(135deg, rgba(13, 93, 31, 0.95) 0%, rgba(26, 122, 46, 0.95) 100%)',
                  color: 'rgba(255, 215, 0, 1)',
                  border: '2px solid rgba(255, 215, 0, 0.8)',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.3s',
                }}
              >
                {loading ? '룸 생성 중...' : '🆕 새 게임 만들기'}
              </button>
              <button
                onClick={() => setStep('joinRoom')}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '20px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  background: 'rgba(0, 0, 0, 0.5)',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                🔗 게임 참가하기
              </button>
            </div>
          </div>
        )}

        {step === 'joinRoom' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                }}
              >
                룸 ID 입력
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="룸 ID를 입력하세요"
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '18px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  outline: 'none',
                }}
                disabled={loading}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep('createOrJoin')}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: 'rgba(0, 0, 0, 0.5)',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                뒤로
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={loading || !inviteCode.trim()}
                style={{
                  flex: 2,
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: loading || !inviteCode.trim()
                    ? 'rgba(60, 60, 60, 0.7)'
                    : 'linear-gradient(135deg, rgba(13, 93, 31, 0.95) 0%, rgba(26, 122, 46, 0.95) 100%)',
                  color: 'rgba(255, 215, 0, 1)',
                  border: '2px solid rgba(255, 215, 0, 0.8)',
                  borderRadius: '12px',
                  cursor: loading || !inviteCode.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !inviteCode.trim() ? 0.5 : 1,
                }}
              >
                {loading ? '참가 중...' : '참가하기'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid rgba(239, 68, 68, 0.6)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {step === 'roomCreated' && roomId && (
          <div>
            <div
              style={{
                marginBottom: '32px',
                padding: '24px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '2px solid rgba(59, 130, 246, 0.6)',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '16px', marginBottom: '16px', color: '#93c5fd' }}>
                🎮 룸이 생성되었습니다!
              </p>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <p style={{ fontSize: '14px', marginBottom: '8px', color: '#93c5fd' }}>
                  룸 ID
                </p>
                <p
                  style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: 'rgba(255, 215, 0, 1)',
                    letterSpacing: '2px',
                    fontFamily: 'monospace',
                  }}
                >
                  {roomId}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(roomId.toString());
                  alert('룸 ID가 복사되었습니다!');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  background: 'rgba(0, 0, 0, 0.5)',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '16px',
                }}
              >
                📋 룸 ID 복사하기
              </button>
              <p style={{ fontSize: '14px', color: '#93c5fd' }}>
                상대방에게 이 ID를 공유하세요
              </p>
            </div>
            <p style={{ fontSize: '14px', color: '#93c5fd', textAlign: 'center', marginTop: '16px' }}>
              상대방이 룸에 참가하면 게임이 자동으로 시작됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

