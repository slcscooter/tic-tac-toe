import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, StartOption } from '../types/game';
import { createInitialGameState, makeMove } from '../utils/gameUtils';
import { getBestMove } from '../utils/aiUtils';
import { Board } from './Board';
import { GameControls } from './GameControls';
import { GameStatus } from './GameStatus';

export function Game() {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState('human')
  );
  const [isThinking, setIsThinking] = useState(false);
  const processingAIMove = useRef(false);

  const handleNewGame = useCallback((startOption: StartOption) => {
    const newGameState = createInitialGameState(startOption);
    setGameState(newGameState);
    setIsThinking(false);
    processingAIMove.current = false;
  }, []);

  const handleCellClick = useCallback((index: number) => {
    if (gameState.status !== 'playing' ||
        gameState.currentPlayer !== gameState.humanPlayer ||
        isThinking) {
      return;
    }

    const newGameState = makeMove(gameState, index);
    setGameState(newGameState);
  }, [gameState, isThinking]);

  // Handle AI moves
  useEffect(() => {
    if (gameState.status === 'playing' &&
        gameState.currentPlayer === gameState.aiPlayer &&
        !isThinking &&
        !processingAIMove.current) {

      processingAIMove.current = true;
      setIsThinking(true);

      // Add a small delay to show AI is "thinking"
      const delay = gameState.board.every(cell => cell === null) ? 300 : 500;
      const timer = setTimeout(() => {
        const aiMoveIndex = getBestMove(gameState.board, gameState.aiPlayer);

        if (aiMoveIndex !== -1) {
          const newGameState = makeMove(gameState, aiMoveIndex);
          setGameState(newGameState);
        }

        setIsThinking(false);
        processingAIMove.current = false;
      }, delay);

      return () => {
        clearTimeout(timer);
        setIsThinking(false);
        processingAIMove.current = false;
      };
    }
  }, [gameState.status, gameState.currentPlayer, gameState.aiPlayer, gameState.board.join('')]);

  const isGameActive = gameState.status === 'playing' || gameState.status === 'won' || gameState.status === 'draw';
  const isBoardDisabled = gameState.status !== 'playing' ||
                          gameState.currentPlayer !== gameState.humanPlayer ||
                          isThinking;

  return (
    <div className="game">
      <GameControls
        onNewGame={handleNewGame}
        isGameActive={isGameActive}
      />

      <GameStatus gameState={gameState} />

      <Board
        board={gameState.board}
        onCellClick={handleCellClick}
        disabled={isBoardDisabled}
      />
    </div>
  );
}