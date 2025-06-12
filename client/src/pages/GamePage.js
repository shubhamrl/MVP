import React from 'react';
import { useNavigate } from 'react-router-dom';

const GamePage = () => {
  const nav = useNavigate();
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Choose Your Game</h1>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button onClick={() => nav('/game/tbh')} style={{ padding: '1rem 2rem' }}>
          Titali Bhavara
        </button>
        <button onClick={() => nav('/game/spin')} style={{ padding: '1rem 2rem' }}>
          Spin to Win
        </button>
      </div>
    </div>
  );
};

export default GamePage;
