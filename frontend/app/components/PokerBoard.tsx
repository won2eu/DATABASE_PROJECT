'use client';

import { useState, useEffect, useRef } from 'react';

interface PokerBoardProps {
  // 플레이어 정보
  bottomPlayerChips?: number;
  topPlayerChips?: number;
  // 게임 상태
  pot?: number;
  carryOverPot?: number;
  currentTurnUserId?: number | null;
  isMyTurn?: boolean;
  // 카드 분배 트리거
  dealCards?: boolean;
  // 카드 정보
  bottomPlayerCard?: {
    frontValue: number;
    backValue: number;
  } | null;
  topPlayerCard?: {
    frontValue: number;
    backValue: number;
  } | null;
  // 게임 상태
  roundState?: string; // 'dealing' | 'side_selection' | 'betting' | 'revealing' | 'ended'
  // 승부 면 선택
  bottomPlayerChosenSide?: 'front' | 'back' | 'double_side' | null;
  topPlayerChosenSide?: 'front' | 'back' | 'double_side' | null;
  onSideSelect?: (side: 'front' | 'back' | 'double_side') => void;
  // 베팅 정보
  currentBet?: number; // 현재 최대 베팅 금액
  minBet?: number; // 최소 베팅 금액
  myBetTotal?: number; // 내가 베팅한 총 금액
  canDoubleSideBet?: boolean; // 양면 베팅 가능 여부
  onBettingAction?: (action: 'raise' | 'call' | 'fold' | 'double_side', amount?: number) => void;
  // 승패 판정 결과
  roundResult?: 'win' | 'lose' | 'draw' | 'double_side_win' | 'double_side_lose' | null;
  revealedBottomValue?: number | null; // 하단 플레이어 공개된 숫자
  revealedTopValue?: number | null; // 상단 플레이어 공개된 숫자
  chipsGained?: number; // 획득한 칩 (음수면 잃은 칩)
  onNextRound?: () => void; // 다음 라운드 시작
  // 게임 종료
  gameOver?: boolean; // 게임 종료 여부
  gameWinner?: 'bottom' | 'top' | null; // 게임 승자
  onNewGame?: () => void; // 새 게임 시작
}

export default function PokerBoard({
  bottomPlayerChips = 30,
  topPlayerChips = 30,
  pot = 0,
  carryOverPot = 0,
  currentTurnUserId = null,
  isMyTurn = false,
  dealCards = false,
  bottomPlayerCard = null,
  topPlayerCard = null,
  roundState = 'dealing',
  bottomPlayerChosenSide = null,
  topPlayerChosenSide = null,
  onSideSelect,
  currentBet = 0,
  minBet = 1,
  myBetTotal = 0,
  canDoubleSideBet = false,
  onBettingAction,
  roundResult = null,
  revealedBottomValue = null,
  revealedTopValue = null,
  chipsGained = 0,
  onNextRound,
  gameOver = false,
  gameWinner = null,
  onNewGame,
}: PokerBoardProps) {
  const requiredBet = Math.max(0, currentBet - myBetTotal);
  // Raise 최소 금액: 앞서 베팅된 칩보다 더 많은 칩만 베팅하면 됨 (최소 1칩만 더 올리면 됨)
  const minRaiseAmount = minBet; // 최소 1칩만 더 올리면 Raise 가능
  const [raiseAmount, setRaiseAmount] = useState(minRaiseAmount); // 올리는 금액
  const maxRaiseAmount = Math.max(0, bottomPlayerChips - requiredBet); // 올릴 수 있는 최대 금액
  
  // currentBet이 변경되면 raiseAmount 업데이트
  useEffect(() => {
    setRaiseAmount(minBet);
  }, [currentBet, minBet]);
  const totalPot = pot + carryOverPot;
  const [dealingState, setDealingState] = useState<'idle' | 'dealing' | 'complete'>('idle');
  const [card1Visible, setCard1Visible] = useState(false);
  const [card2Visible, setCard2Visible] = useState(false);
  const [revealState, setRevealState] = useState<'idle' | 'revealing' | 'collecting' | 'complete'>('idle');
  const [cardFlipped, setCardFlipped] = useState(false); // 카드가 뒤집혔는지 여부 (숫자 변경용)
  
  // 카드 공개 애니메이션 시작
  useEffect(() => {
    console.log('🔍 [DEBUG PokerBoard] useEffect - roundState:', roundState, 'revealState:', revealState);
    console.log('🔍 [DEBUG PokerBoard] revealedBottomValue:', revealedBottomValue, 'revealedTopValue:', revealedTopValue);
    
    if (roundState === 'revealing' && revealState === 'idle') {
      console.log('🔍 [DEBUG PokerBoard] 애니메이션 시작!');
      setRevealState('revealing');
      setCardFlipped(false);
      // 카드 뒤집기 중간(0.6초, 50% 시점)에 숫자 변경
      setTimeout(() => {
        setCardFlipped(true);
        console.log('🔍 [DEBUG PokerBoard] 카드 뒤집기 완료 (숫자 변경)');
      }, 600);
      // 카드 뒤집힌 후 3초 동안 유지
      setTimeout(() => {
        setRevealState('collecting');
        console.log('🔍 [DEBUG PokerBoard] collecting 상태로 변경');
        setTimeout(() => {
          setRevealState('complete');
          console.log('🔍 [DEBUG PokerBoard] complete 상태로 변경');
        }, 2000); // collecting 애니메이션 2초
      }, 4200); // 1.2초(애니메이션) + 3초(유지) = 4.2초
    } else if (roundState === 'dealing' || roundState === 'side_selection' || roundState === 'betting') {
      // 새로운 라운드가 시작되면 애니메이션 상태 리셋
      if (revealState !== 'idle') {
        setRevealState('idle');
        setCardFlipped(false);
      }
    } else if (roundState !== 'revealing' && revealState !== 'revealing' && revealState !== 'collecting' && revealState !== 'complete') {
      // revealing, collecting, complete 상태가 아닐 때만 idle로 리셋
      // complete 상태는 애니메이션이 완전히 끝난 후에만 리셋
      setRevealState('idle');
      setCardFlipped(false);
    }
  }, [roundState, revealState, revealedBottomValue, revealedTopValue]);

  useEffect(() => {
    if (dealCards && dealingState === 'idle') {
      setDealingState('dealing');
      // 첫 번째 카드 (하단 플레이어)
      setTimeout(() => setCard1Visible(true), 300);
      // 두 번째 카드 (상단 플레이어)
      setTimeout(() => setCard2Visible(true), 800);
      // 애니메이션 완료
      setTimeout(() => {
        setDealingState('complete');
      }, 2500);
    } else if (!dealCards) {
      setDealingState('idle');
      setCard1Visible(false);
      setCard2Visible(false);
    }
  }, [dealCards, dealingState]);
  
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 3D 컨테이너 - 원근감 설정 */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          perspective: '1500px',
          perspectiveOrigin: 'center 40%',
        }}
      >
        {/* 보드판 컨테이너 */}
        <div
          className="relative"
          style={{
            transform: 'rotateX(70deg) translateY(-60px)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 초록색 포커 테이블 (양면 포커 보드) */}
          <div
            className="relative rounded-full border-4 border-amber-900 shadow-2xl"
            style={{
              width: '1200px',
              height: '1200px',
              background: 'linear-gradient(135deg, #0a4d1a 0%, #1a7a2e 30%, #2d9f4f 50%, #1a7a2e 70%, #0a4d1a 100%)',
              boxShadow: `
                0 30px 80px rgba(0, 0, 0, 0.9),
                inset 0 0 150px rgba(0, 0, 0, 0.4),
                inset 0 20px 60px rgba(13, 93, 31, 0.3)
              `,
            }}
          >
            {/* 테이블 가장자리 하이라이트 */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(13, 93, 31, 0.6) 0%, rgba(0, 0, 0, 0.5) 70%)',
              }}
            />
            
            {/* 내부 원형 패턴 */}
            <div
              className="absolute inset-8 rounded-full border-2 border-amber-800 opacity-40"
              style={{
                background: 'radial-gradient(circle, rgba(13, 93, 31, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)',
              }}
            />

            {/* 카드 더미 (덱) */}
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                transform: 'translate(-50%, -50%) rotateX(70deg)',
                zIndex: 40,
              }}
            >
              <div
                style={{
                  width: '150px',
                  height: '210px',
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 0 30px rgba(0, 0, 0, 0.5)',
                  position: 'relative',
                }}
              >
                {/* 더미 효과 - 여러 장 쌓인 느낌 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 215, 0, 0.4)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                  }}
                />
              </div>
            </div>

            {/* 카드 분배 애니메이션 */}
            <style>{`
              @keyframes dealFromDeckToBottom {
                0% {
                  transform: translate(-50%, -50%) rotateX(70deg) translateZ(0px);
                  opacity: 1;
                  z-index: 50;
                }
                50% {
                  transform: translate(-50%, -50%) rotateX(70deg) translateZ(50px);
                  opacity: 1;
                }
                80% {
                  transform: translate(-50%, calc(-50% + 160px)) rotateX(70deg) translateZ(0px);
                  opacity: 1;
                }
                100% {
                  transform: translate(-50%, calc(-50% + 200px)) rotateX(70deg) translateZ(0px);
                  opacity: 0;
                  z-index: 10;
                }
              }
              @keyframes dealFromDeckToTop {
                0% {
                  transform: translate(-50%, -50%) rotateX(70deg) translateZ(0px);
                  opacity: 1;
                  z-index: 50;
                }
                50% {
                  transform: translate(-50%, -50%) rotateX(70deg) translateZ(50px);
                  opacity: 1;
                }
                80% {
                  transform: translate(-50%, calc(-50% - 160px)) rotateX(70deg) translateZ(0px);
                  opacity: 1;
                }
                100% {
                  transform: translate(-50%, calc(-50% - 200px)) rotateX(70deg) translateZ(0px);
                  opacity: 0;
                  z-index: 10;
                }
              }
            `}</style>

            {/* 하단 플레이어 카드 */}
            {card1Visible && (
              <div
                className="absolute top-1/2 left-1/2"
                style={{
                  width: '100px',
                  height: '140px',
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                  borderRadius: '8px',
                  border: '2px solid rgba(255, 215, 0, 0.8)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
                  animation: 'dealFromDeckToBottom 1.2s ease-out forwards',
                }}
              />
            )}

            {/* 상단 플레이어 카드 */}
            {card2Visible && (
              <div
                className="absolute top-1/2 left-1/2"
                style={{
                  width: '100px',
                  height: '140px',
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                  borderRadius: '8px',
                  border: '2px solid rgba(255, 215, 0, 0.8)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
                  animation: 'dealFromDeckToTop 1.2s ease-out forwards',
                }}
              />
            )}


            {/* 하단 플레이어 앞 - FRONT & BACK 쌍 */}
            <div
              className="absolute"
              style={{
                bottom: '150px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '20px',
              }}
            >
              {/* FRONT (오른쪽) */}
              <div
                style={{
                  width: '280px',
                  height: '350px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '12px',
                  border: bottomPlayerChosenSide === 'front' 
                    ? '3px solid rgba(59, 130, 246, 0.9)' 
                    : '2px solid rgba(255, 215, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: bottomPlayerChosenSide === 'front'
                    ? '0 0 20px rgba(59, 130, 246, 0.6), 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.3)'
                    : '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                }}
              >
                {bottomPlayerCard && bottomPlayerChosenSide !== 'back' ? (
                  <>
                    {/* 앞면 숫자 (큰 글씨) */}
                    <div
                      style={{
                        color: '#ffffff',
                        fontSize: '120px',
                        fontWeight: 'bold',
                        textShadow: '0 4px 8px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {bottomPlayerCard.frontValue}
                    </div>
                    {/* 뒷면 숫자 (오른쪽 아래 작게) */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        right: '16px',
                        color: 'rgba(255, 215, 0, 0.8)',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {bottomPlayerCard.backValue}
                    </div>
                  </>
                ) : (
                  <span
                    style={{
                      color: 'rgba(255, 215, 0, 0.9)',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    FRONT
                  </span>
                )}
              </div>
              {/* BACK (왼쪽) */}
              <div
                style={{
                  width: '280px',
                  height: '350px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '12px',
                  border: bottomPlayerChosenSide === 'back' 
                    ? '3px solid rgba(59, 130, 246, 0.9)' 
                    : '2px solid rgba(255, 215, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: bottomPlayerChosenSide === 'back'
                    ? '0 0 20px rgba(59, 130, 246, 0.6), 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.3)'
                    : '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                }}
              >
                {bottomPlayerCard && bottomPlayerChosenSide === 'back' ? (
                  <>
                    {/* 앞면 숫자 (큰 글씨) */}
                    <div
                      style={{
                        color: '#ffffff',
                        fontSize: '120px',
                        fontWeight: 'bold',
                        textShadow: '0 4px 8px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {bottomPlayerCard.frontValue}
                    </div>
                    {/* 뒷면 숫자 (오른쪽 아래 작게) */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        right: '16px',
                        color: 'rgba(255, 215, 0, 0.8)',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {bottomPlayerCard.backValue}
                    </div>
                  </>
                ) : (
                  <span
                    style={{
                      color: 'rgba(255, 215, 0, 0.9)',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    BACK
                  </span>
                )}
              </div>
            </div>


            {/* 상단 플레이어 앞 - FRONT & BACK 쌍 */}
            <div
              className="absolute"
              style={{
                top: '150px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '20px',
              }}
            >
              {/* FRONT (오른쪽) - 뒤집힌 텍스트 */}
              <div
                style={{
                  width: '280px',
                  height: '300px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                }}
              >
                {topPlayerCard ? (
                  <div
                    style={{
                      color: '#ffffff',
                      fontSize: '120px',
                      fontWeight: 'bold',
                      textShadow: '0 4px 8px rgba(0, 0, 0, 0.8)',
                      transform: 'scaleY(-1) scaleX(-1)',
                    }}
                  >
                    {topPlayerCard.frontValue}
                  </div>
                ) : (
                  <span
                    style={{
                      color: 'rgba(255, 215, 0, 0.9)',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                      transform: 'scaleY(-1) scaleX(-1)'
                    }}
                  >
                    FRONT
                  </span>
                )}
              </div>
              {/* BACK (왼쪽) - 뒤집힌 텍스트 */}
              <div
                style={{
                  width: '280px',
                  height: '300px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.3)',
                }}
              >
                <span
                  style={{
                    color: 'rgba(255, 215, 0, 0.9)',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                    transform: 'scaleY(-1) scaleX(-1)',
                  }}
                >
                  BACK
                </span>
              </div>
            </div>
          </div>

          {/* 카드 공개 애니메이션 - 보드판 3D 컨테이너 안에 배치 */}
          {roundState === 'revealing' && (
            <>
              <style>{`
                @keyframes flipCard {
                  0% {
                    transform: rotateY(0deg);
                  }
                  50% {
                    transform: rotateY(90deg);
                  }
                  100% {
                    transform: rotateY(0deg);
                  }
                }
                .flip-card {
                  animation: flipCard 1.2s ease-in-out forwards;
                }
              `}</style>

              {/* 카드 공개 애니메이션 - 하단 플레이어 */}
              {(() => {
                const shouldShow = (revealState === 'revealing' || revealState === 'collecting') && revealedBottomValue !== null && bottomPlayerCard !== null;
                console.log('🔍 [DEBUG PokerBoard] 하단 카드 표시 조건:', {
                  revealState,
                  revealedBottomValue,
                  hasBottomPlayerCard: !!bottomPlayerCard,
                  shouldShow
                });
                return shouldShow && bottomPlayerCard !== null;
              })() && bottomPlayerCard && (
                <div
                  className="absolute"
                  style={{
                    bottom: '150px',
                    left: bottomPlayerChosenSide === 'front' ? 'calc(50% + 140px)' : 'calc(50% - 140px)',
                    transform: 'translateX(-50%)',
                    zIndex: 60,
                  }}
                >
                  <div
                    className="flip-card"
                    style={{
                      width: '280px',
                      height: '350px',
                      background: 'rgba(0, 0, 0, 0.9)',
                      borderRadius: '12px',
                      border: '3px solid rgba(255, 215, 0, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 32px rgba(255, 215, 0, 0.6)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '120px',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        textShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {cardFlipped 
                        ? bottomPlayerCard.backValue  // 뒤집힌 후: 뒷면 숫자
                        : bottomPlayerCard.frontValue} {/* 뒤집기 전: 앞면 숫자 */}
                    </div>
                  </div>
                </div>
              )}

              {/* 카드 공개 애니메이션 - 상단 플레이어 */}
              {(() => {
                const shouldShow = (revealState === 'revealing' || revealState === 'collecting') && revealedTopValue !== null && topPlayerCard !== null;
                console.log('🔍 [DEBUG PokerBoard] 상단 카드 표시 조건:', {
                  revealState,
                  revealedTopValue,
                  hasTopPlayerCard: !!topPlayerCard,
                  shouldShow
                });
                return shouldShow && topPlayerCard !== null;
              })() && topPlayerCard && (
                <div
                  className="absolute"
                  style={{
                    top: '150px',
                    left: topPlayerChosenSide === 'front' ? 'calc(50% + 140px)' : 'calc(50% - 140px)',
                    transform: 'translateX(-50%)',
                    zIndex: 60,
                  }}
                >
                  <div
                    className="flip-card"
                    style={{
                      width: '280px',
                      height: '350px',
                      background: 'rgba(0, 0, 0, 0.9)',
                      borderRadius: '12px',
                      border: '3px solid rgba(255, 215, 0, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 32px rgba(255, 215, 0, 0.6)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '120px',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        textShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
                        transform: 'scaleY(-1) scaleX(-1)',
                      }}
                    >
                      {cardFlipped 
                        ? topPlayerCard.backValue  // 뒤집힌 후: 뒷면 숫자
                        : topPlayerCard.frontValue} {/* 뒤집기 전: 앞면 숫자 */}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 칩 개수 및 POT 표시 - 보드판 기울기 영향 없음 */}
      {/* 중앙 포트(Pot) 표시 */}
      <div
        className="absolute top-1/2 left-60"
        style={{
          textAlign: 'center',
          zIndex: 20,
          transform: 'translate(-50%, calc(-50% - 30px))',
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '16px',
            padding: '4px 20px',
            border: '2px solid rgba(255, 215, 0, 0.8)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
          }}
        >
          <div
            style={{
              color: 'rgba(255, 215, 0, 0.9)',
              fontSize: '8px',
              fontWeight: 'bold',
              marginBottom: '4px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            POT
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            {totalPot}
          </div>
          {carryOverPot > 0 && (
            <div
              style={{
                color: 'rgba(255, 215, 0, 0.7)',
                fontSize: '12px',
                marginTop: '4px',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
              }}
            >
              (이월: {carryOverPot})
            </div>
          )}
        </div>
      </div>

      {/* 하단 플레이어 칩 개수 표시 */}
      <div
        className="absolute bottom-12"
        style={{
          left: 'calc(50% - 220px)',
          zIndex: 20,
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '12px',
            padding: '12px 24px',
            border: isMyTurn ? '2px solid rgba(59, 130, 246, 0.9)' : '2px solid rgba(255, 215, 0, 0.6)',
            boxShadow: isMyTurn ? '0 0 20px rgba(59, 130, 246, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              color: 'rgba(255, 215, 0, 0.9)',
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '4px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
            }}
          >
            칩
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            {bottomPlayerChips}
          </div>
          {isMyTurn && (
            <div
              style={{
                color: 'rgba(59, 130, 246, 0.9)',
                fontSize: '12px',
                marginTop: '4px',
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
              }}
            >
              YOUR TURN
            </div>
          )}
        </div>
      </div>

      {/* 상단 플레이어 칩 개수 표시 */}
      <div
        className="absolute top-24"
        style={{
          left: 'calc(50% - 200px)',
          zIndex: 20,
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '12px',
            padding: '8px 19px',
            border: !isMyTurn && currentTurnUserId ? '2px solid rgba(59, 130, 246, 0.9)' : '2px solid rgba(255, 215, 0, 0.6)',
            boxShadow: !isMyTurn && currentTurnUserId ? '0 0 20px rgba(59, 130, 246, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              color: 'rgba(255, 215, 0, 0.9)',
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '4px',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
            }}
          >
            칩
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            {topPlayerChips}
          </div>
          {!isMyTurn && currentTurnUserId && (
            <div
              style={{
                color: 'rgba(59, 130, 246, 0.9)',
                fontSize: '12px',
                marginTop: '4px',
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
              }}
            >
              상대 턴
            </div>
          )}
        </div>
      </div>

      {/* 승부 면 선택 UI */}
      {roundState === 'side_selection' && isMyTurn && !bottomPlayerChosenSide && (
        <div
          className="absolute bottom-8 right-8"
          style={{
            zIndex: 30,
            display: 'flex',
            gap: '20px',
          }}
        >
          <button
            onClick={() => onSideSelect?.('front')}
            style={{
              padding: '20px 40px',
              background: 'linear-gradient(135deg, rgba(13, 93, 31, 0.95) 0%, rgba(26, 122, 46, 0.95) 100%)',
              color: 'rgba(255, 215, 0, 1)',
              border: '2px solid rgba(255, 215, 0, 0.8)',
              borderRadius: '16px',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 215, 0, 0.2)',
              transition: 'all 0.3s ease',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(26, 122, 46, 1) 0%, rgba(45, 159, 79, 1) 100%)';
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 215, 0, 0.4), inset 0 2px 4px rgba(255, 215, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(13, 93, 31, 0.95) 0%, rgba(26, 122, 46, 0.95) 100%)';
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 215, 0, 0.2)';
            }}
          >
            FRONT
          </button>
          <button
            onClick={() => onSideSelect?.('back')}
            style={{
              padding: '20px 40px',
              background: 'linear-gradient(135deg, rgba(13, 93, 31, 0.95) 0%, rgba(26, 122, 46, 0.95) 100%)',
              color: 'rgba(255, 215, 0, 1)',
              border: '2px solid rgba(255, 215, 0, 0.8)',
              borderRadius: '16px',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 215, 0, 0.2)',
              transition: 'all 0.3s ease',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(26, 122, 46, 1) 0%, rgba(45, 159, 79, 1) 100%)';
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 215, 0, 0.4), inset 0 2px 4px rgba(255, 215, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(13, 93, 31, 0.95) 0%, rgba(26, 122, 46, 0.95) 100%)';
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 215, 0, 0.2)';
            }}
          >
            BACK
          </button>
          <button
            onClick={() => onSideSelect?.('double_side')}
            style={{
              padding: '20px 40px',
              background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.95) 0%, rgba(218, 165, 32, 0.95) 100%)',
              color: 'rgba(0, 0, 0, 1)',
              border: '2px solid rgba(255, 215, 0, 0.8)',
              borderRadius: '16px',
              fontSize: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 215, 0, 0.2)',
              transition: 'all 0.3s ease',
              textShadow: '0 2px 4px rgba(255, 255, 255, 0.3)',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(218, 165, 32, 1) 0%, rgba(255, 215, 0, 1) 100%)';
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 215, 0, 0.4), inset 0 2px 4px rgba(255, 215, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(184, 134, 11, 0.95) 0%, rgba(218, 165, 32, 0.95) 100%)';
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 215, 0, 0.2)';
            }}
          >
            양면베팅
          </button>
        </div>
      )}

      {/* 베팅 액션 UI */}
      {roundState === 'betting' && isMyTurn && (
        <div
          className="absolute bottom-8 right-8"
          style={{
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minWidth: '300px',
          }}
        >
          {/* 베팅 정보 표시 */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '2px solid rgba(255, 215, 0, 0.6)',
            }}
          >
            <div style={{ color: 'rgba(255, 215, 0, 0.9)', fontSize: '12px', marginBottom: '4px' }}>
              현재 베팅: {currentBet}칩
            </div>
            <div style={{ color: '#ffffff', fontSize: '14px' }}>
              필요 베팅: {requiredBet}칩
            </div>
          </div>

          {/* Raise 버튼 및 입력 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <button
                onClick={() => {
                  setRaiseAmount(Math.max(minRaiseAmount, raiseAmount - 1));
                }}
                disabled={raiseAmount <= minRaiseAmount}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  borderRadius: '8px',
                  color: 'rgba(255, 215, 0, 1)',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  cursor: raiseAmount > minRaiseAmount ? 'pointer' : 'not-allowed',
                  opacity: raiseAmount > minRaiseAmount ? 1 : 0.5,
                  transition: 'all 0.2s',
                }}
              >
                -
              </button>
              <div
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                +{raiseAmount}칩
              </div>
              <button
                onClick={() => {
                  setRaiseAmount(Math.min(maxRaiseAmount, raiseAmount + 1));
                }}
                disabled={raiseAmount >= maxRaiseAmount}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  borderRadius: '8px',
                  color: 'rgba(255, 215, 0, 1)',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  cursor: raiseAmount < maxRaiseAmount ? 'pointer' : 'not-allowed',
                  opacity: raiseAmount < maxRaiseAmount ? 1 : 0.5,
                  transition: 'all 0.2s',
                }}
              >
                +
              </button>
              <button
                onClick={() => {
                  // 총 베팅 금액 = 현재 베팅 + 올리는 금액
                  // 앞서 베팅된 칩(currentBet)보다 더 많은 칩을 베팅해야 함
                  const totalBetAmount = currentBet + raiseAmount;
                  onBettingAction?.('raise', totalBetAmount);
                }}
                disabled={raiseAmount < minRaiseAmount || raiseAmount > maxRaiseAmount || (currentBet + raiseAmount) <= currentBet}
                style={{
                  padding: '12px 24px',
                  background: raiseAmount >= minRaiseAmount && raiseAmount <= maxRaiseAmount && (currentBet + raiseAmount) > currentBet
                    ? 'linear-gradient(135deg, rgba(13, 93, 31, 0.95) 0%, rgba(26, 122, 46, 0.95) 100%)'
                    : 'rgba(60, 60, 60, 0.7)',
                  color: 'rgba(255, 215, 0, 1)',
                  border: '2px solid rgba(255, 215, 0, 0.8)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: raiseAmount >= minRaiseAmount && raiseAmount <= maxRaiseAmount && (currentBet + raiseAmount) > currentBet ? 'pointer' : 'not-allowed',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  transition: 'all 0.2s',
                  opacity: raiseAmount >= minRaiseAmount && raiseAmount <= maxRaiseAmount && (currentBet + raiseAmount) > currentBet ? 1 : 0.5,
                }}
              >
                Raise
              </button>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            {/* Call 버튼 */}
            <button
              onClick={() => onBettingAction?.('call')}
              disabled={requiredBet > bottomPlayerChips || requiredBet === 0}
              style={{
                flex: 1,
                padding: '16px 24px',
                background: requiredBet > 0 && requiredBet <= bottomPlayerChips
                  ? 'linear-gradient(135deg, rgba(13, 93, 31, 0.95) 0%, rgba(26, 122, 46, 0.95) 100%)'
                  : 'rgba(60, 60, 60, 0.7)',
                color: 'rgba(255, 215, 0, 1)',
                border: '2px solid rgba(255, 215, 0, 0.8)',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: requiredBet > 0 && requiredBet <= bottomPlayerChips ? 'pointer' : 'not-allowed',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.2s',
                opacity: requiredBet > 0 && requiredBet <= bottomPlayerChips ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (requiredBet > 0 && requiredBet <= bottomPlayerChips) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.7)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
              }}
            >
              {requiredBet === 0 ? '이미 맞춤' : `Call (${requiredBet}칩)`}
            </button>

            {/* Fold 버튼 */}
            <button
              onClick={() => onBettingAction?.('fold')}
              style={{
                flex: 1,
                padding: '16px 24px',
                background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.95) 0%, rgba(178, 34, 34, 0.95) 100%)',
                color: '#ffffff',
                border: '2px solid rgba(255, 0, 0, 0.8)',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(139, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
              }}
            >
              Fold
            </button>
          </div>

          {/* 양면 베팅 버튼 */}
          {canDoubleSideBet && (
            <button
              onClick={() => onBettingAction?.('double_side', requiredBet * 2)}
              disabled={requiredBet * 2 > bottomPlayerChips}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: requiredBet * 2 <= bottomPlayerChips
                  ? 'linear-gradient(135deg, rgba(75, 0, 130, 0.95) 0%, rgba(138, 43, 226, 0.95) 100%)'
                  : 'rgba(60, 60, 60, 0.7)',
                color: '#ffffff',
                border: '2px solid rgba(138, 43, 226, 0.8)',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: requiredBet * 2 <= bottomPlayerChips ? 'pointer' : 'not-allowed',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.2s',
                opacity: requiredBet * 2 <= bottomPlayerChips ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (requiredBet * 2 <= bottomPlayerChips) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(138, 43, 226, 0.7)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
              }}
            >
              양면 베팅 ({requiredBet * 2}칩)
            </button>
          )}
        </div>
      )}

      {/* 베팅 수집 애니메이션 */}
      {roundState === 'revealing' && (
        <>
          {/* 베팅 수집 애니메이션 */}
          {revealState === 'collecting' && roundResult && totalPot > 0 && (
            <>
              <style>{`
                @keyframes collectToBottom {
                  0% {
                    transform: translate(calc(50vw - 240px), calc(50vh - 30px)) scale(1);
                    opacity: 1;
                  }
                  100% {
                    transform: translate(calc(50vw - 220px), calc(100vh - 80px)) scale(0.2);
                    opacity: 0;
                  }
                }
                @keyframes collectToTop {
                  0% {
                    transform: translate(calc(50vw - 240px), calc(50vh - 30px)) scale(1);
                    opacity: 1;
                  }
                  100% {
                    transform: translate(calc(50vw - 210px), 80px) scale(0.2);
                    opacity: 0;
                  }
                }
                .collect-to-bottom {
                  animation: collectToBottom 2s ease-out forwards;
                }
                .collect-to-top {
                  animation: collectToTop 2s ease-out forwards;
                }
              `}</style>
              {/* 여러 개의 칩 애니메이션 */}
              {[...Array(Math.min(5, Math.floor(totalPot / 2)))].map((_, i) => (
                <div
                  key={i}
                  className={`absolute ${roundResult === 'win' || roundResult === 'double_side_win' ? 'collect-to-bottom' : 'collect-to-top'}`}
                  style={{
                    left: '50vw',
                    top: '50vh',
                    zIndex: 70,
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      background: 'radial-gradient(circle, rgba(255, 215, 0, 1) 0%, rgba(184, 134, 11, 1) 100%)',
                      borderRadius: '50%',
                      border: '3px solid rgba(255, 215, 0, 1)',
                      boxShadow: '0 4px 20px rgba(255, 215, 0, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}
                  >
                    💰
                  </div>
                </div>
              ))}
            </>
          )}

        </>
      )}

      {/* 게임 종료 UI (최종 승리/패배) */}
      {gameOver && gameWinner && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.95)',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.95)',
              borderRadius: '24px',
              padding: '60px',
              border: '4px solid rgba(255, 215, 0, 1)',
              boxShadow: '0 12px 48px rgba(255, 215, 0, 0.5)',
              maxWidth: '700px',
              textAlign: 'center',
            }}
          >
            {/* 최종 결과 제목 */}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                marginBottom: '20px',
                color: gameWinner === 'bottom' ? '#4ade80' : '#ef4444',
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
              }}
            >
              {gameWinner === 'bottom' ? '🎉 게임 승리! 🎉' : '게임 패배'}
            </div>

            {/* 최종 메시지 */}
            <div
              style={{
                fontSize: '24px',
                color: '#ffffff',
                marginBottom: '40px',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
              }}
            >
              {gameWinner === 'bottom' 
                ? '축하합니다! 모든 칩을 획득했습니다!'
                : '상대방이 모든 칩을 획득했습니다.'}
            </div>

            {/* 최종 칩 개수 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                marginBottom: '40px',
                gap: '40px',
              }}
            >
              <div>
                <div style={{ color: 'rgba(255, 215, 0, 0.9)', fontSize: '16px', marginBottom: '8px' }}>
                  내 칩
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {bottomPlayerChips}칩
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255, 215, 0, 0.9)', fontSize: '16px', marginBottom: '8px' }}>
                  상대 칩
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {topPlayerChips}칩
                </div>
              </div>
            </div>

            {/* 새 게임 버튼 */}
            {onNewGame && (
              <button
                onClick={onNewGame}
                style={{
                  padding: '20px 40px',
                  background: 'linear-gradient(135deg, rgba(13, 93, 31, 0.95) 0%, rgba(26, 122, 46, 0.95) 100%)',
                  color: 'rgba(255, 215, 0, 1)',
                  border: '3px solid rgba(255, 215, 0, 1)',
                  borderRadius: '16px',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 215, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';
                }}
              >
                새 게임 시작
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

