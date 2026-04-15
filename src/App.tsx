import { useEffect, useRef } from 'react';
import { createGame } from './game/config';
import type Phaser from 'phaser';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = createGame(containerRef.current);
      if (import.meta.env.DEV) (window as unknown as { PHASER_GAME?: Phaser.Game }).PHASER_GAME = gameRef.current;
    }

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />;
}
