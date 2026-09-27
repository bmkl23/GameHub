"use client";

interface ScoreBoardProps {
  score: number;
  level: number;
}

export default function ScoreBoard({ score, level }: ScoreBoardProps) {
  return (
    <div className="score-board">
      SCORE {score} · LV {level}
    </div>
  );
}
