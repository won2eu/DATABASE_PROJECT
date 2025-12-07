'use client';

import { useState, useEffect } from 'react';
import PokerBoard from './components/PokerBoard';
import Lobby from './components/Lobby';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  // 게임 상태: 'lobby' | 'playing' | 'gameOver'
  const [gameStatus, setGameStatus] = useState<'lobby' | 'playing' | 'gameOver'>('lobby');
  const [lobbyKey, setLobbyKey] = useState(0); // Lobby 컴포넌트 리마운트용
  
  // 자신의 user_id와 room_id
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [roundId, setRoundId] = useState<number | null>(null);
  
  // 게임 상태 (UI용 - 기본값 유지)
  const [dealCards, setDealCards] = useState(false);
  const [roundState, setRoundState] = useState<'dealing' | 'side_selection' | 'betting' | 'revealing' | 'ended'>('dealing');
  
  // 카드 정보 (UI용 - 기본값 유지)
  const [bottomPlayerCard, setBottomPlayerCard] = useState<{ frontValue: number; backValue: number } | null>(null);
  const [topPlayerCard, setTopPlayerCard] = useState<{ frontValue: number; backValue: number } | null>(null);
  const [bottomPlayerChosenSide, setBottomPlayerChosenSide] = useState<'front' | 'back' | 'double_side' | null>(null);
  const [topPlayerChosenSide, setTopPlayerChosenSide] = useState<'front' | 'back' | 'double_side' | null>(null);
  
  // 베팅 정보 (UI용 - 기본값 유지)
  const [currentBet, setCurrentBet] = useState(1);
  const [myBetTotal, setMyBetTotal] = useState(1);
  const [canDoubleSideBet, setCanDoubleSideBet] = useState(false);
  const [isDoubleSideBet, setIsDoubleSideBet] = useState(false);
  
  // 플레이어 정보 (UI용 - 기본값 유지)
  const [bottomPlayerChips, setBottomPlayerChips] = useState(30);
  const [topPlayerChips, setTopPlayerChips] = useState(30);
  const [topPlayerUsername, setTopPlayerUsername] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [currentTurnUserId, setCurrentTurnUserId] = useState<number | null>(null);
  
  // 게임 결과 (UI용 - 기본값 유지)
  const [roundResult, setRoundResult] = useState<'win' | 'lose' | 'draw' | 'double_side_win' | 'double_side_lose' | null>(null);
  const [revealedBottomValue, setRevealedBottomValue] = useState<number | null>(null);
  const [revealedTopValue, setRevealedTopValue] = useState<number | null>(null);
  const [chipsGained, setChipsGained] = useState(0);
  const [pot, setPot] = useState(0);
  const [carryOverPot, setCarryOverPot] = useState(0);
  
  // 게임 종료 (UI용 - 기본값 유지)
  const [gameOver, setGameOver] = useState(false);
  const [gameWinner, setGameWinner] = useState<'bottom' | 'top' | null>(null);
  
  // 게임 진행 시간
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 게임 시작 핸들러 (로비에서 호출)
  const handleStartGame = async (userId: number, roomIdParam: number) => {
    // 모든 게임 상태 초기화 (이전 게임 상태 제거)
    setGameOver(false);
    setGameWinner(null);
    setRoundResult(null);
    setRoundState('dealing');
    setBottomPlayerCard(null);
    setTopPlayerCard(null);
    setBottomPlayerChosenSide(null);
    setTopPlayerChosenSide(null);
    setDealCards(false);
    setPot(0);
    setCarryOverPot(0);
    setCurrentBet(1);
    setMyBetTotal(0);
    setCanDoubleSideBet(false);
    setIsDoubleSideBet(false);
    setRevealedBottomValue(null);
    setRevealedTopValue(null);
    setChipsGained(0);
    setIsMyTurn(false);
    setCurrentTurnUserId(null);
    setRoundId(null);
    
    setMyUserId(userId);
    setRoomId(roomIdParam);
    
    // 매치 정보 가져오기
    try {
      const matchResponse = await fetch(`${API_URL}/api/matches/room/${roomIdParam}`);
      if (!matchResponse.ok) {
        console.error('매치를 찾을 수 없습니다. 아직 게임이 시작되지 않았습니다.');
        // 매치가 없으면 로비 상태 유지
        return;
      }
      
      const match = await matchResponse.json();
      setMatchId(match.id);
      
      // 게임 시작 시간 기록
      setGameStartTime(Date.now());
      setElapsedTime(0);
      
      // 게임 상태를 playing으로 변경 (매치가 있을 때만)
      setGameStatus('playing');
      
      // 플레이어 칩 정보 업데이트
      const myPlayer = match.players.find((p: any) => p.user_id === userId);
      const otherPlayer = match.players.find((p: any) => p.user_id !== userId);
      
      if (myPlayer) {
        setBottomPlayerChips(myPlayer.chips);
      }
      if (otherPlayer) {
        setTopPlayerChips(otherPlayer.chips);
        setTopPlayerUsername(otherPlayer.username);
      }
      
      // 현재 라운드 정보 가져오기
      await fetchCurrentRound(match.id, userId);
    } catch (error) {
      console.error('게임 정보 로드 실패:', error);
      // 에러 발생 시 로비 상태 유지
    }
  };

  // 현재 라운드 정보 가져오기
  const fetchCurrentRound = async (matchIdParam: number, userId: number) => {
    try {
      // 매치의 현재 라운드 가져오기
      const roundResponse = await fetch(`${API_URL}/api/rounds/match/${matchIdParam}/current`);
      
      if (!roundResponse.ok) {
        console.error('라운드를 찾을 수 없습니다');
        return;
      }
      
      const round = await roundResponse.json();
      updateGameState(round, userId);
    } catch (error) {
      console.error('라운드 정보 로드 실패:', error);
    }
  };

  // 매치 ID가 변경되면 라운드 정보 가져오기
  useEffect(() => {
    if (matchId && myUserId) {
      fetchCurrentRound(matchId, myUserId);
    }
  }, [matchId, myUserId]);

  // 게임 진행 시간 업데이트
  useEffect(() => {
    if (gameStatus !== 'playing' || !gameStartTime) {
      setElapsedTime(0);
      return;
    }
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameStatus, gameStartTime]);

  // 실시간 업데이트 (폴링)
  useEffect(() => {
    if (!matchId || !myUserId || gameStatus !== 'playing') return;
    
    let lastRoundId: number | null = null;
    let lastState: string | null = null;
    let lastTurnUserId: number | null = null;
    let lastMyChosenSide: string | null = null;
    let lastOtherChosenSide: string | null = null;
    
    const pollInterval = setInterval(async () => {
      try {
        // 현재 라운드 정보 가져오기
        const roundResponse = await fetch(`${API_URL}/api/rounds/match/${matchId}/current`);
        if (!roundResponse.ok) {
          // 404는 라운드가 아직 생성되지 않았을 수 있으므로 조용히 무시
          if (roundResponse.status === 404) return;
          // 다른 에러는 로그만 남기고 계속
          console.warn('라운드 정보 조회 실패:', roundResponse.status);
          return;
        }
        
        const round = await roundResponse.json();
        
        // 라운드가 변경되었으면 상태 초기화
        if (round.id !== lastRoundId && lastRoundId !== null) {
          console.log('🔍 [DEBUG polling] 라운드 변경 감지 - 새 라운드:', round.id, '이전 라운드:', lastRoundId);
          // 상태 초기화
          setRoundResult(null);
          setRevealedBottomValue(null);
          setRevealedTopValue(null);
          setChipsGained(0);
          setBottomPlayerChosenSide(null);
          setTopPlayerChosenSide(null);
          setTopPlayerChosenSide(null);
          setMyBetTotal(0);
          setCurrentBet(1);
          setDealCards(false); // 애니메이션 리셋
          setCanDoubleSideBet(false);
          setIsDoubleSideBet(false);
          setRoundState('dealing');
          
          // 새로운 라운드 시작 시 카드 분배 애니메이션 트리거
          // 약간의 딜레이 후 애니메이션 시작 (상태 초기화 후)
          setTimeout(() => {
            setDealCards(true);
          }, 100);
        }
        
        // 변경 사항 확인
        const myCard = round.cards?.find((c: any) => c.player_id === myUserId);
        const otherCard = round.cards?.find((c: any) => c.player_id !== myUserId);
        const currentMyChosenSide = myCard?.chosen_side || null;
        const currentOtherChosenSide = otherCard?.chosen_side || null;
        
        const hasChanged = 
          round.id !== lastRoundId ||
          round.state !== lastState ||
          round.current_turn_user_id !== lastTurnUserId ||
          currentMyChosenSide !== lastMyChosenSide ||
          currentOtherChosenSide !== lastOtherChosenSide;
        
        // revealing 상태일 때는 업데이트하지 않음 (애니메이션 중)
        // reveal/ended 상태인데 아직 revealing이 아니면 업데이트
        const isRevealState = round.state === 'reveal' || round.state === 'revealing' || round.state === 'ended';
        const shouldUpdate = (
          hasChanged && // 변경 사항이 있어야 함
          roundState !== 'revealing' && // revealing 상태가 아니어야 함
          (isRevealState || round.state !== 'ended') // reveal 상태이거나 ended가 아닐 때만
        ) || (
          round.id !== lastRoundId && lastRoundId !== null // 라운드가 변경되었을 때는 항상 업데이트
        );
        
        if (shouldUpdate) {
          console.log('🔍 [DEBUG polling] 상태 업데이트 - round.state:', round.state, 'roundState:', roundState, 'hasChanged:', hasChanged);
          lastRoundId = round.id;
          lastState = round.state;
          lastTurnUserId = round.current_turn_user_id;
          lastMyChosenSide = currentMyChosenSide;
          lastOtherChosenSide = currentOtherChosenSide;
          
          updateGameState(round, myUserId, true); // revealing 상태일 때는 스킵
          
          // 매치 정보도 업데이트
          await fetchMatchInfo();
        }
      } catch (error: any) {
        // 네트워크 에러는 조용히 무시 (백엔드 서버가 꺼졌거나 네트워크 문제)
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          // 백엔드 서버가 실행되지 않았거나 네트워크 문제
          // 조용히 무시하고 다음 폴링에서 재시도
          return;
        }
        console.error('폴링 실패:', error);
      }
    }, 1000); // 1초마다 폴링 (더 빠른 반응)
    
    return () => clearInterval(pollInterval);
  }, [matchId, myUserId, gameStatus, roundState]);

  // 라운드 정보로 게임 상태 업데이트
  const updateGameState = (round: any, userId: number, skipIfRevealing: boolean = false) => {
    if (!round) return;
    
    // 라운드 ID 저장
    const currentRoundId = round.id;
    setRoundId(currentRoundId);
    
    // 카드 정보 추출
    const myCard = round.cards?.find((c: any) => c.player_id === userId);
    const otherCard = round.cards?.find((c: any) => c.player_id !== userId);
    
    // revealing 상태일 때는 카드 정보를 업데이트하지 않음 (애니메이션 중)
    // 하지만 revealedBottomValue와 revealedTopValue는 설정해야 함
    const isRevealingState = skipIfRevealing && (round.state === 'reveal' || round.state === 'revealing' || round.state === 'ended');
    
    if (!isRevealingState) {
      // revealing 상태가 아닐 때만 카드 정보 업데이트
      if (myCard) {
        setBottomPlayerCard({
          frontValue: myCard.front_value,
          backValue: myCard.back_value,
        });
        setBottomPlayerChosenSide(myCard.chosen_side || null);
      }
      
      if (otherCard) {
        setTopPlayerCard({
          frontValue: otherCard.front_value,
          backValue: otherCard.back_value,
        });
        // 상대방이 선택한 면을 표시 (상대방에게도 보이게)
        setTopPlayerChosenSide(otherCard.chosen_side || null);
      }
      
      // 라운드 상태 업데이트
      // reveal 또는 ended 상태일 때는 revealing으로 변환 (애니메이션 시작)
      // ended 상태는 이미 결과가 나온 상태이지만, 카드를 공개하는 애니메이션을 보여줘야 함
      if (round.state === 'reveal' || round.state === 'revealing' || round.state === 'ended') {
        // reveal, revealing, ended 상태일 때는 항상 revealing으로 설정 (애니메이션 시작)
        console.log('🔍 [DEBUG updateGameState] reveal/ended 상태 감지 -> revealing으로 변환');
        setRoundState('revealing');
      } else {
        // 다른 상태로 변경
        setRoundState(round.state || 'dealing');
      }
    }
    
    // reveal 상태일 때 카드 값 설정 (상대방이 Call 했을 때 polling으로 받아옴)
    // Call을 하지 않은 플레이어도 애니메이션을 볼 수 있도록
    // 두 플레이어 모두 카드 값을 설정해야 애니메이션이 표시됨
    // revealing 상태일 때도 이 값들은 설정해야 함
    if ((round.state === 'reveal' || round.state === 'revealing' || round.state === 'ended') && round.cards) {
      const myCardForReveal = round.cards.find((c: any) => c.player_id === userId);
      const otherCardForReveal = round.cards.find((c: any) => c.player_id !== userId);
      
      console.log('🔍 [DEBUG updateGameState] 카드 값 설정 - myCard:', myCardForReveal, 'otherCard:', otherCardForReveal);
      
      // 카드 값 설정 (항상 업데이트 - 이미 설정되어 있어도 덮어쓰기)
      // 두 플레이어 모두 카드 값을 설정해야 애니메이션이 표시됨
      if (myCardForReveal && myCardForReveal.chosen_side) {
        let myValue = null;
        if (myCardForReveal.chosen_side === 'front') {
          myValue = myCardForReveal.front_value;
        } else if (myCardForReveal.chosen_side === 'back') {
          myValue = myCardForReveal.back_value;
        } else if (myCardForReveal.chosen_side === 'double_side') {
          myValue = myCardForReveal.front_value;
        }
        if (myValue !== null) {
          console.log('🔍 [DEBUG updateGameState] setRevealedBottomValue:', myValue);
          setRevealedBottomValue(myValue);
        }
      }
      
      if (otherCardForReveal && otherCardForReveal.chosen_side) {
        let otherValue = null;
        if (otherCardForReveal.chosen_side === 'front') {
          otherValue = otherCardForReveal.front_value;
        } else if (otherCardForReveal.chosen_side === 'back') {
          otherValue = otherCardForReveal.back_value;
        } else if (otherCardForReveal.chosen_side === 'double_side') {
          otherValue = otherCardForReveal.front_value;
        }
        if (otherValue !== null) {
          console.log('🔍 [DEBUG updateGameState] setRevealedTopValue:', otherValue);
          setRevealedTopValue(otherValue);
        }
      }
      
      // revealing 상태로 설정 (이미 설정되어 있어도 다시 설정)
      if (isRevealingState) {
        console.log('🔍 [DEBUG updateGameState] revealing 상태 - roundState만 설정');
        setRoundState('revealing');
      }
    }
    setPot(round.pot || 0);
    setCarryOverPot(round.carry_over_pot || 0);
    setCurrentTurnUserId(round.current_turn_user_id);
    
    // 내 턴인지 확인 (면 선택 단계에서는 아직 선택하지 않은 플레이어가 턴)
    if (round.state === 'side_selection') {
      // 면 선택 단계: 아직 선택하지 않은 플레이어가 턴
      const myChosen = myCard?.chosen_side !== null && myCard?.chosen_side !== undefined;
      const otherChosen = otherCard?.chosen_side !== null && otherCard?.chosen_side !== undefined;
      
      // 둘 다 선택했으면 베팅 단계로, 아니면 아직 선택하지 않은 사람이 턴
      if (!myChosen && !otherChosen) {
        // 둘 다 선택 안 함 - 선 플레이어가 턴
        setIsMyTurn(round.current_turn_user_id === userId);
      } else if (myChosen && !otherChosen) {
        // 내가 선택했고 상대방이 안 함 - 상대방 턴
        setIsMyTurn(false);
      } else if (!myChosen && otherChosen) {
        // 내가 안 선택했고 상대방이 함 - 내 턴
        setIsMyTurn(true);
      } else {
        // 둘 다 선택함 - 베팅 단계
        setIsMyTurn(round.current_turn_user_id === userId);
      }
    } else {
      // 다른 단계에서는 current_turn_user_id로 판단
      setIsMyTurn(round.current_turn_user_id === userId);
    }
    
    // 베팅 정보 업데이트
    if (round.actions && round.actions.length > 0) {
      const myActions = round.actions.filter((a: any) => a.player_id === userId && (a.action_type === 'bet' || a.action_type === 'raise'));
      const myTotalBet = myActions.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
      setMyBetTotal(myTotalBet);
      
      const otherActions = round.actions.filter((a: any) => a.player_id !== userId && (a.action_type === 'bet' || a.action_type === 'raise'));
      const otherTotalBet = otherActions.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
      setCurrentBet(Math.max(myTotalBet, otherTotalBet));
    }
    
    // 양면베팅 여부 확인
    if (round.is_double_side_bet) {
      setCanDoubleSideBet(true);
      const myCard = round.cards?.find((c: any) => c.player_id === userId);
      if (myCard?.chosen_side === 'double_side') {
        setIsDoubleSideBet(true);
      }
    }
    
    // 라운드 결과 처리
    if (round.state === 'ended' && round.result) {
      handleRoundEnd(round, userId).catch(console.error);
    }
    
    // 카드 분배 애니메이션 시작 (라운드가 시작될 때만)
    // 라운드가 변경되지 않았을 때만 애니메이션 시작 (중복 방지)
    if ((round.state === 'side_selection' || round.state === 'betting' || round.state === 'dealing') && !dealCards) {
      setDealCards(true);
    }
  };

  // 라운드 종료 처리
  const handleRoundEnd = async (round: any, userId: number) => {
    if (!round.result) return;
    
    // 매치가 ACTIVE 상태가 아니면 처리하지 않음 (새 게임 시작 시 이전 게임의 ended 라운드 방지)
    if (matchId) {
      try {
        const matchCheck = await fetch(`${API_URL}/api/matches/${matchId}`).then(r => r.ok ? r.json() : null);
        if (!matchCheck || matchCheck.status !== 'active') {
          console.log('매치가 ACTIVE 상태가 아니므로 라운드 종료 처리 스킵:', matchCheck?.status);
          return;
        }
      } catch (error) {
        console.error('매치 상태 확인 실패:', error);
        return;
      }
    }
    
    const myCard = round.cards?.find((c: any) => c.player_id === userId);
    const otherCard = round.cards?.find((c: any) => c.player_id !== userId);
    
    // 공개된 숫자 표시
    if (myCard) {
      let myValue = null;
      if (myCard.chosen_side === 'front') {
        myValue = myCard.front_value;
      } else if (myCard.chosen_side === 'back') {
        myValue = myCard.back_value;
      } else if (myCard.chosen_side === 'double_side') {
        // 양면베팅일 때는 둘 다 표시 (앞면과 뒷면)
        myValue = myCard.front_value; // 일단 앞면 표시
      }
      if (myValue !== null) {
        setRevealedBottomValue(myValue);
      }
    }
    
    if (otherCard) {
      let otherValue = null;
      if (otherCard.chosen_side === 'front') {
        otherValue = otherCard.front_value;
      } else if (otherCard.chosen_side === 'back') {
        otherValue = otherCard.back_value;
      } else if (otherCard.chosen_side === 'double_side') {
        // 양면베팅일 때는 둘 다 표시
        otherValue = otherCard.front_value; // 일단 앞면 표시
      }
      if (otherValue !== null) {
        setRevealedTopValue(otherValue);
      }
    }
    
    // 결과 판정
    if (round.result === 'tie') {
      setRoundResult('draw');
      setChipsGained(0);
    } else if (round.winner_id === userId) {
      // 승리
      if (round.is_double_side_bet && myCard?.chosen_side === 'double_side') {
        setRoundResult('double_side_win');
        setChipsGained(round.pot + round.double_side_bonus);
      } else {
        setRoundResult('win');
        setChipsGained(round.pot);
      }
    } else {
      // 패배
      if (round.is_double_side_bet && myCard?.chosen_side === 'double_side') {
        setRoundResult('double_side_lose');
        setChipsGained(-round.pot);
      } else {
        setRoundResult('lose');
        setChipsGained(-round.pot);
      }
    }
    
    // 매치 정보 업데이트 (칩 정보) 후 다음 라운드 자동 시작
    if (matchId) {
      fetchMatchInfo().then(() => {
        // 게임이 종료되지 않았으면 애니메이션 완료 후 다음 라운드 자동 시작
        setTimeout(async () => {
          // 다시 한 번 게임 종료 확인
          const currentMatch = await fetch(`${API_URL}/api/matches/${matchId}`).then(r => r.ok ? r.json() : null);
          if (currentMatch && currentMatch.status !== 'ended') {
            await handleNextRound();
          }
          }, 6500); // 1.2초(뒤집기) + 3초(유지) + 2초(수집) = 6.2초, 여유있게 6.5초
      });
    }
  };

  // 매치 정보 가져오기
  const fetchMatchInfo = async () => {
    if (!matchId || !myUserId) return;
    
    try {
      const matchResponse = await fetch(`${API_URL}/api/matches/${matchId}`);
      if (!matchResponse.ok) return;
      
      const match = await matchResponse.json();
      
      // 매치가 ACTIVE 상태가 아니면 게임 종료 상태를 설정하지 않음 (새 게임 시작 시 이전 게임 정보 방지)
      if (match.status !== 'active') {
        // ACTIVE가 아닌 매치는 칩 정보만 업데이트하고 게임 종료 상태는 설정하지 않음
        const myPlayer = match.players.find((p: any) => p.user_id === myUserId);
        const otherPlayer = match.players.find((p: any) => p.user_id !== myUserId);
        
        if (myPlayer) {
          setBottomPlayerChips(myPlayer.chips);
        }
        if (otherPlayer) {
          setTopPlayerChips(otherPlayer.chips);
          setTopPlayerUsername(otherPlayer.username);
        }
        return;
      }
      
      const myPlayer = match.players.find((p: any) => p.user_id === myUserId);
      const otherPlayer = match.players.find((p: any) => p.user_id !== myUserId);
      
      if (myPlayer) {
        setBottomPlayerChips(myPlayer.chips);
        if (myPlayer.chips <= 0) {
          setGameOver(true);
          setGameWinner('top');
        }
      }
      if (otherPlayer) {
        setTopPlayerChips(otherPlayer.chips);
        setTopPlayerUsername(otherPlayer.username);
        if (otherPlayer.chips <= 0) {
          setGameOver(true);
          setGameWinner('bottom');
        }
      }
      
      // 매치 종료 확인 (ACTIVE 상태일 때만)
      if (match.status === 'ended') {
        setGameOver(true);
      }
    } catch (error) {
      console.error('매치 정보 로드 실패:', error);
    }
  };

  // 면 선택 핸들러
  const handleSideSelect = async (side: 'front' | 'back' | 'double_side') => {
    if (!roundId || !myUserId) {
      console.error('라운드 ID 또는 사용자 ID가 없습니다');
      return;
    }
    
    try {
      // 면 선택 API 호출
      const selectResponse = await fetch(`${API_URL}/api/rounds/${roundId}/select-side`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: myUserId,
          side: side,
        }),
      });
      
      if (!selectResponse.ok) {
        const error = await selectResponse.json();
        console.error('면 선택 실패:', error.detail);
        alert(`면 선택 실패: ${error.detail}`);
        return;
      }
      
      const updatedRound = await selectResponse.json();
      updateGameState(updatedRound, myUserId);
      
      // 상대방도 선택했으면 베팅 단계로, 아니면 상대방 차례
      if (updatedRound.state === 'betting') {
        // 베팅 정보 업데이트
        const myActions = updatedRound.actions.filter((a: any) => a.player_id === myUserId && a.action_type === 'bet');
        const totalBet = myActions.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
        setMyBetTotal(totalBet);
        
        const otherActions = updatedRound.actions.filter((a: any) => a.player_id !== myUserId && a.action_type === 'bet');
        const otherTotalBet = otherActions.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
        setCurrentBet(Math.max(totalBet, otherTotalBet));
      } else if (updatedRound.state === 'side_selection') {
        // 상대방 차례면 잠시 후 다시 확인
        setTimeout(async () => {
          if (matchId && myUserId) {
            await fetchCurrentRound(matchId, myUserId);
          }
        }, 500);
      }
    } catch (error) {
      console.error('면 선택 실패:', error);
      alert('면 선택 중 오류가 발생했습니다');
    }
  };

  // 베팅 액션 핸들러
  const handleBettingAction = async (action: 'raise' | 'call' | 'fold' | 'double_side', amount?: number) => {
    if (!roundId || !myUserId) {
      console.error('라운드 ID 또는 사용자 ID가 없습니다');
      return;
    }
    
    try {
      // 베팅 액션 API 호출
      const actionResponse = await fetch(`${API_URL}/api/rounds/${roundId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: myUserId,
          action_type: action,
          amount: amount,
        }),
      });
      
      if (!actionResponse.ok) {
        const error = await actionResponse.json();
        console.error('베팅 액션 실패:', error.message || error.detail);
        alert(`베팅 액션 실패: ${error.message || error.detail}`);
        return;
      }
      
      const response = await actionResponse.json();
      
      if (!response.success) {
        alert(`베팅 액션 실패: ${response.message}`);
        return;
      }
      
      if (response.round) {
        console.log('🔍 [DEBUG] handleBettingAction - action:', action, 'response.round.state:', response.round.state);
        
        // Call 했을 때는 카드 공개 애니메이션 시작
        // 백엔드가 'reveal' 상태를 반환하거나, 'ended' 상태지만 아직 카드를 공개하지 않은 경우
        if (action === 'call' && (response.round.state === 'reveal' || response.round.state === 'revealing' || 
            (response.round.state === 'ended' && !revealedBottomValue && !revealedTopValue))) {
          console.log('🔍 [DEBUG] Call 액션 - 애니메이션 시작');
          console.log('🔍 [DEBUG] response.round.state:', response.round.state);
          
          // 카드 정보 추출하여 공개된 숫자 설정
          const myCard = response.round.cards?.find((c: any) => c.player_id === myUserId);
          const otherCard = response.round.cards?.find((c: any) => c.player_id !== myUserId);
          
          console.log('🔍 [DEBUG] myCard:', myCard);
          console.log('🔍 [DEBUG] otherCard:', otherCard);
          
          // 두 플레이어 모두 카드 값을 설정해야 애니메이션이 표시됨
          if (myCard && myCard.chosen_side) {
            let myValue = null;
            if (myCard.chosen_side === 'front') {
              myValue = myCard.front_value;
            } else if (myCard.chosen_side === 'back') {
              myValue = myCard.back_value;
            } else if (myCard.chosen_side === 'double_side') {
              myValue = myCard.front_value; // 양면베팅일 때는 앞면 표시
            }
            console.log('🔍 [DEBUG] myValue:', myValue);
            if (myValue !== null) {
              setRevealedBottomValue(myValue);
              console.log('🔍 [DEBUG] setRevealedBottomValue 호출:', myValue);
            }
          }
          
          if (otherCard && otherCard.chosen_side) {
            let otherValue = null;
            if (otherCard.chosen_side === 'front') {
              otherValue = otherCard.front_value;
            } else if (otherCard.chosen_side === 'back') {
              otherValue = otherCard.back_value;
            } else if (otherCard.chosen_side === 'double_side') {
              otherValue = otherCard.front_value; // 양면베팅일 때는 앞면 표시
            }
            console.log('🔍 [DEBUG] otherValue:', otherValue);
            if (otherValue !== null) {
              setRevealedTopValue(otherValue);
              console.log('🔍 [DEBUG] setRevealedTopValue 호출:', otherValue);
            }
          }
          
          console.log('🔍 [DEBUG] setRoundState("revealing") 호출 전');
          setRoundState('revealing');
          console.log('🔍 [DEBUG] setRoundState("revealing") 호출 후');
          
          // 애니메이션이 시작되도록 하기 위해 updateGameState는 호출하지 않음
          // (roundState는 이미 'revealing'으로 설정했고, updateGameState가 덮어쓸 수 있음)
          // 대신 필요한 정보만 업데이트
          setPot(response.round.pot || 0);
          setCarryOverPot(response.round.carry_over_pot || 0);
          
          // 애니메이션 완료 후 결과 처리
          setTimeout(async () => {
            updateGameState(response.round, myUserId);
            if (response.round.state === 'ended') {
              await handleRoundEnd(response.round, myUserId);
            }
          }, 6200); // 애니메이션 완료 후 (1.2초 + 3초 + 2초 = 6.2초)
        } else {
          // Call이 아닌 다른 액션 (raise, fold 등)
          // ended 상태일 때는 애니메이션 시작
          if (response.round.state === 'ended' && roundState !== 'revealing') {
            console.log('🔍 [DEBUG] ended 상태 감지 - 애니메이션 시작');
            setRoundState('revealing');
            
            // 카드 정보 추출하여 공개된 숫자 설정
            const myCard = response.round.cards?.find((c: any) => c.player_id === myUserId);
            const otherCard = response.round.cards?.find((c: any) => c.player_id !== myUserId);
            
            // 두 플레이어 모두 카드 값을 설정해야 애니메이션이 표시됨
            if (myCard && myCard.chosen_side) {
              let myValue = null;
              if (myCard.chosen_side === 'front') {
                myValue = myCard.front_value;
              } else if (myCard.chosen_side === 'back') {
                myValue = myCard.back_value;
              } else if (myCard.chosen_side === 'double_side') {
                myValue = myCard.front_value;
              }
              if (myValue !== null) {
                setRevealedBottomValue(myValue);
              }
            }
            
            if (otherCard && otherCard.chosen_side) {
              let otherValue = null;
              if (otherCard.chosen_side === 'front') {
                otherValue = otherCard.front_value;
              } else if (otherCard.chosen_side === 'back') {
                otherValue = otherCard.back_value;
              } else if (otherCard.chosen_side === 'double_side') {
                otherValue = otherCard.front_value;
              }
              if (otherValue !== null) {
                setRevealedTopValue(otherValue);
              }
            }
            
            // 애니메이션 완료 후 결과 처리
            setTimeout(async () => {
              updateGameState(response.round, myUserId);
              await handleRoundEnd(response.round, myUserId);
            }, 10200);
          } else {
            updateGameState(response.round, myUserId);
            
            // 라운드가 종료되었으면 결과 처리
            if (response.round.state === 'ended') {
              await handleRoundEnd(response.round, myUserId);
            }
          }
        }
      }
      
      // 매치 정보 업데이트 (칩 정보)
      await fetchMatchInfo();
    } catch (error) {
      console.error('베팅 액션 실패:', error);
      alert('베팅 액션 중 오류가 발생했습니다');
    }
  };

  // 다음 라운드 시작
  const handleNextRound = async () => {
    if (!matchId || !myUserId || gameOver) return;
    
    try {
      // 먼저 현재 라운드 확인 (이미 다음 라운드가 시작되었을 수 있음)
      const currentRoundResponse = await fetch(`${API_URL}/api/rounds/match/${matchId}/current`);
      let round;
      let currentRoundNo = 0;
      
      if (currentRoundResponse.ok) {
        const currentRound = await currentRoundResponse.json();
        currentRoundNo = currentRound.round_no;
        
        // 현재 라운드가 이전 라운드보다 크면 이미 다음 라운드가 시작된 것
        if (roundId) {
          const prevRoundResponse = await fetch(`${API_URL}/api/rounds/${roundId}`);
          if (prevRoundResponse.ok) {
            const prevRound = await prevRoundResponse.json();
            if (currentRound.round_no > prevRound.round_no) {
              round = currentRound;
            }
          }
        }
      }
      
      // 다음 라운드가 아직 시작되지 않았으면 시작
      if (!round) {
        const roundResponse = await fetch(`${API_URL}/api/rounds/${matchId}/start`, {
          method: 'POST',
        });
        
        if (!roundResponse.ok) {
          // 에러가 발생했지만 중복 키 에러일 수 있음 - 다시 현재 라운드 확인
          const retryResponse = await fetch(`${API_URL}/api/rounds/match/${matchId}/current`);
          if (retryResponse.ok) {
            round = await retryResponse.json();
          } else {
            const error = await roundResponse.json();
            console.error('라운드 시작 실패:', error.detail);
            return;
          }
        } else {
          round = await roundResponse.json();
        }
      }
      
      // 상태 초기화
      setRoundResult(null);
      setRevealedBottomValue(null);
      setRevealedTopValue(null);
      setChipsGained(0);
      setBottomPlayerChosenSide(null);
      setTopPlayerChosenSide(null);
      setMyBetTotal(0);
      setCurrentBet(1);
      setDealCards(false);
      setCanDoubleSideBet(false);
      setIsDoubleSideBet(false);
      setRoundState('dealing');
      
      // 새 라운드 정보로 업데이트
      updateGameState(round, myUserId);
      
      // 매치 정보 업데이트
      await fetchMatchInfo();
    } catch (error) {
      console.error('라운드 시작 실패:', error);
    }
  };

  // 게임 종료 후 로비로 돌아가기
  const handleBackToLobby = () => {
    setGameStatus('lobby');
    setMyUserId(null);
    setRoomId(null);
    setMatchId(null);
    setRoundId(null);
    setGameOver(false);
    setGameWinner(null);
    setGameStartTime(null);
    setElapsedTime(0);
    // 모든 게임 상태 초기화
    setRoundState('dealing');
    setRoundResult(null);
    setBottomPlayerCard(null);
    setTopPlayerCard(null);
    setBottomPlayerChosenSide(null);
    setTopPlayerChosenSide(null);
    setDealCards(false);
    setBottomPlayerChips(30);
    setTopPlayerChips(30);
    setTopPlayerUsername(null);
    setPot(0);
    setCarryOverPot(0);
    setCurrentBet(1);
    setMyBetTotal(0);
    setCanDoubleSideBet(false);
    setIsDoubleSideBet(false)
    setRevealedBottomValue(null);
    setRevealedTopValue(null);
    setChipsGained(0);
    setIsMyTurn(false);
    setCurrentTurnUserId(null);
    // Lobby 컴포넌트 완전히 리마운트하여 상태 초기화
    setLobbyKey(prev => prev + 1);
  };

  // 로비 화면
  if (gameStatus === 'lobby') {
    return <Lobby key={lobbyKey} onStartGame={handleStartGame} />;
  }

  // 게임 플레이 화면 (UI는 유지)
  return (
    <>
      <PokerBoard 
        dealCards={dealCards}
        bottomPlayerCard={bottomPlayerCard}
        topPlayerCard={topPlayerCard}
        roundState={roundState}
        bottomPlayerChosenSide={bottomPlayerChosenSide}
        topPlayerChosenSide={topPlayerChosenSide}
        isMyTurn={isMyTurn}
        bottomPlayerChips={bottomPlayerChips}
        topPlayerChips={topPlayerChips}
        pot={pot}
        carryOverPot={carryOverPot}
        currentTurnUserId={currentTurnUserId}
        onSideSelect={handleSideSelect}
        currentBet={currentBet}
        minBet={1}
        myBetTotal={myBetTotal}
        canDoubleSideBet={canDoubleSideBet}
        onBettingAction={handleBettingAction}
        roundResult={roundResult}
        revealedBottomValue={revealedBottomValue}
        revealedTopValue={revealedTopValue}
        chipsGained={chipsGained}
        gameOver={gameOver}
        gameWinner={gameWinner}
        onNextRound={handleNextRound}
        onNewGame={handleBackToLobby}
        elapsedTime={elapsedTime}
        topPlayerUsername={topPlayerUsername}
      />
    </>
  );
}
