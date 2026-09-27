import type { Metadata } from 'next';
import GameCanvas from '@/components/game/GameCanvas';

export const metadata: Metadata = {
  title: 'Nexora — Game Hub',
  description: 'Endless running & jumping game',
};

export default function NexoraPage() {
  return (
    <main className="game-page">
      <GameCanvas />
    </main>
  );
}
