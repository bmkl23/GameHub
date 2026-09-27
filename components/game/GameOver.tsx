"use client";

interface GameOverProps {
  score: number;
  onRestart: () => void;
}

export default function GameOver({ score, onRestart }: GameOverProps) {
  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <h2>GAME OVER</h2>
        <p className="game-over-score">Score: {score}</p>
        <button type="button" onClick={onRestart}>
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
