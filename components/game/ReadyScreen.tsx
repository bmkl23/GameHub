"use client";

interface ReadyScreenProps {
  onStart: () => void;
}

export default function ReadyScreen({ onStart }: ReadyScreenProps) {
  return (
    <div className="ready-overlay">
      <div className="ready-card">
        <h1>NEXORA</h1>
        <p>Endless Running &amp; Jumping — Game 01</p>
        <button type="button" onClick={onStart}>
          START
        </button>
      </div>
    </div>
  );
}
