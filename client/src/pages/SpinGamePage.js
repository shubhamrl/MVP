// client/src/pages/SpinGamePage.js
import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import api from '../services/api';
import '../styles/game.css';

const socketSpin = io('http://localhost:5000');
const NUMBERS = Array.from({ length: 10 }, (_, i) => i.toString());

export default function SpinGamePage() {
  const [timer, setTimer] = useState(90);
  const [bets, setBets] = useState({});
  const [choice, setChoice] = useState(null);
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [liveWinner, setLiveWinner] = useState(null);
  const [lastWins, setLastWins] = useState([]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me');
      setBalance(res.data.balance);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBets = async () => {
    try {
      const res = await api.get('/bets/current-round');
      setBets(res.data.totals);
    } catch (err) {
      console.error(err);
    }
  };

  const onWinner = (data) => {
    setLiveWinner(data.choice);
    setLastWins(w => [data.choice, ...w].slice(0, 10));
    setTimeout(() => setLiveWinner(null), 5000);
  };

  const tick = () => {
    setTimer(t => {
      if (t <= 1) {
        fetchBets();
        return 90;
      }
      return t - 1;
    });
  };

  useEffect(() => {
    fetchProfile();
    fetchBets();
    socketSpin.on('bet-placed', fetchBets);
    socketSpin.on('winner-announced', onWinner);
    const iv = setInterval(tick, 1000);
    return () => { clearInterval(iv); socketSpin.disconnect(); };
  }, []);

  const handleBet = () => {
    const amt = parseInt(amount, 10);
    if (timer <= 15 || amt <= 0 || balance < amt || choice == null) return;
    api.post('/bets/place-bet', { choice, amount: amt })
      .then(() => {
        setBalance(b => b - amt);
        setBets(prev => ({ ...prev, [choice]: (prev[choice] || 0) + amt }));
        setAmount('');
      })
      .catch(e => alert(e.response?.data?.message || 'Bet failed'));
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h2>⏱️ {timer}s</h2>
        <h3>💰 ₹{balance}</h3>
        {liveWinner && <div className="live-winner">🎯 {liveWinner}</div>}
      </div>

      <div className="wheel"></div>

      <div className="number-grid">
        {NUMBERS.map(num => (
          <div
            key={num}
            className={`card ${choice === num ? 'selected' : ''}`}
            onClick={() => timer > 15 && setChoice(num)}
          >
            <div className="name">{num}</div>
            <p className="bet">₹{bets[num] || 0}</p>
          </div>
        ))}
      </div>

      <div className="bet-controls">
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="₹"
        />
        <button onClick={handleBet}>Bet</button>
      </div>

      <div className="last-wins">
        <h4>📜 Last 10 Wins</h4>
        <ul>{lastWins.map((w, i) => <li key={i}>{w}</li>)}</ul>
      </div>
    </div>
  );
}



