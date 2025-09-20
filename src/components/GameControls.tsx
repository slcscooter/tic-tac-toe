import type { StartOption } from '../types/game';

interface GameControlsProps {
  onNewGame: (startOption: StartOption) => void;
  isGameActive: boolean;
}

export function GameControls({ onNewGame, isGameActive }: GameControlsProps) {
  const handleStartOptionClick = (option: StartOption) => {
    onNewGame(option);
  };

  return (
    <div className="game-controls">
      <h2>Tic Tac Toe</h2>

      <div className="start-options">
        <h3>Start New Game</h3>
        <div className="button-group">
          <button
            onClick={() => handleStartOptionClick('human')}
            className="control-button"
          >
            You Go First
          </button>
          <button
            onClick={() => handleStartOptionClick('ai')}
            className="control-button"
          >
            AI Goes First
          </button>
          <button
            onClick={() => handleStartOptionClick('random')}
            className="control-button"
          >
            Random Start
          </button>
        </div>
      </div>

      {isGameActive && (
        <button
          onClick={() => handleStartOptionClick('random')}
          className="control-button reset-button"
        >
          Reset Game
        </button>
      )}
    </div>
  );
}