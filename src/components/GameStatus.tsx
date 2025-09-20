import type { GameState } from '../types/game';

interface GameStatusProps {
  gameState: GameState;
}

export function GameStatus({ gameState }: GameStatusProps) {
  const { status, winner, currentPlayer, humanPlayer, aiPlayer } = gameState;

  const getStatusMessage = () => {
    switch (status) {
      case 'won':
        if (winner === humanPlayer) {
          return '🎉 You won! Great job!';
        } else {
          return '🤖 AI wins! Try again?';
        }
      case 'draw':
        return '🤝 It\'s a draw! Good game!';
      case 'playing':
        if (currentPlayer === humanPlayer) {
          return `Your turn (${humanPlayer})`;
        } else {
          return `AI is thinking... (${aiPlayer})`;
        }
      default:
        return 'Select a start option to begin!';
    }
  };

  return (
    <div className="game-status">
      <p className="status-message">{getStatusMessage()}</p>
      {status === 'playing' && (
        <div className="player-info">
          <span className="player-indicator">
            You: {humanPlayer} | AI: {aiPlayer}
          </span>
        </div>
      )}
    </div>
  );
}