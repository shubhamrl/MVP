import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import api from '../services/api';
import '../styles/game.css';

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnectionAttempts: 5,
  timeout: 20000,
});

const IMAGE_LIST = [
  { name: 'umbrella',    src: '/images/umbrella.png'     },
  { name: 'football',    src: '/images/football.png'     },
  { name: 'sun',         src: '/images/sun.png'          },
  { name: 'diya',        src: '/images/diya.png'         },
  { name: 'cow',         src: '/images/cow.png'          },
  { name: 'bucket',      src: '/images/bucket.png'       },
  { name: 'kite',        src: '/images/kite.png'         },
  { name: 'spinningTop', src: '/images/spinning_Top.png' },
  { name: 'rose',        src: '/images/rose.png'         },
  { name: 'butterfly',   src: '/images/butterfly.png'    },
  { name: 'pigeon',      src: '/images/pigeon.png'       },
  { name: 'rabbit',      src: '/images/rabbit.png'       }
];

export default function TBGamePage() {
  const [inputValues, setInputValues] = useState({});
  const [highlighted, setHighlighted] = useState([]);
  const [lastWins, setLastWins] = useState(() => {
    const stored = JSON.parse(localStorage.getItem('tbLastWins') || '[]');
    return Array.isArray(stored) ? stored : [];
  });

  // Live state from /live-state
  const [currentRound, setCurrentRound] = useState(1);
  const [timer, setTimer] = useState(90);
  const [bets, setBets] = useState({});
  const [winnerChoice, setWinnerChoice] = useState(null);
  const [displayedWinner, setDisplayedWinner] = useState(null);
  const [balance, setBalance] = useState(0);

  // ---- Live-state every second ----
  useEffect(() => {
    const fetchLiveState = async () => {
      try {
        const res = await api.get('/bets/live-state');
        setCurrentRound(res.data.round);
        setTimer(res.data.timer);
        setBets(res.data.totals || {});
        setWinnerChoice(res.data.winnerChoice || null);
        if (typeof res.data.balance === "number") setBalance(res.data.balance);
      } catch (err) {
        console.error("Error fetching live state:", err);
      }
    };
    fetchLiveState();
    const interval = setInterval(fetchLiveState, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Winner: socket events, payout trigger, display ---
  useEffect(() => {
    // Listen for winner-announced socket (admin/auto winner set)
    const winnerListener = ({ round, choice }) => {
      setWinnerChoice(choice);
      setDisplayedWinner(choice);
      // Last 10 wins update
      setLastWins(prev => {
        const updated = [choice, ...prev].slice(0, 10);
        localStorage.setItem('tbLastWins', JSON.stringify(updated));
        return updated;
      });
      // Hide after 3 sec (for animation effect)
      setTimeout(() => setDisplayedWinner(null), 3000);
    };
    socket.on('winner-announced', winnerListener);

    return () => {
      socket.off('winner-announced', winnerListener);
    };
  }, []);

  // --- Payout trigger: har bar timer 0 pe call karo, backend decide karega manual/auto winner ---
  useEffect(() => {
    if (timer === 0) {
      api.post('/bets/distribute-payouts', { round: currentRound })
        .catch(() => {});
    }
    // eslint-disable-next-line
  }, [timer, currentRound]);

  // ---- Bets, Balance ----

  const handleInputChange = (name, val) => {
    if (/^\d*$/.test(val)) {
      setInputValues(prev => ({ ...prev, [name]: val }));
    }
  };

  const placeBetHandler = async (name) => {
    const amt = parseInt(inputValues[name] || '0', 10);
    if (timer <= 15) {
      alert('Betting closed for the last 15 seconds');
      return;
    }
    if (amt <= 0) return;
    if (balance < amt) {
      alert('Insufficient balance');
      return;
    }
    try {
      await api.post('/bets/place-bet', { choice: name, amount: amt, round: currentRound });

      setBalance(prev => prev - amt);
      setBets(prev => ({ ...prev, [name]: (prev[name] || 0) + amt }));
      setHighlighted(h => (h.includes(name) ? h : [...h, name]));
      setInputValues(iv => ({ ...iv, [name]: '' }));
    } catch (e) {
      alert(e.response?.data?.message || 'Bet failed');
    }
  };

  return (
    <div className="game-container">
      {/* Header: Timer & Balance */}
      <div className="game-header">
        <h2>Round: {currentRound}</h2>
        <h2>⏱️ {timer}s</h2>
        <h3>💰 ₹{balance}</h3>
      </div>
      {/* Image Grid */}
      <div className="image-grid">
        {IMAGE_LIST.map(item => (
          <div
            key={item.name}
            className={`card ${highlighted.includes(item.name) ? 'selected' : ''}`}
          >
            <img src={item.src} alt={item.name} />
            <p className="name">{item.name}</p>
            <p className="bet">₹{bets[item.name] || 0}</p>
            <input
              type="text"
              disabled={timer <= 15}
              value={inputValues[item.name] || ''}
              onChange={e => handleInputChange(item.name, e.target.value)}
              placeholder="₹"
            />
            <button
              disabled={timer <= 15}
              onClick={() => placeBetHandler(item.name)}
            >
              Bet
            </button>
          </div>
        ))}
      </div>
      {/* Winner Box */}
      <div
        className="winner-box"
        style={{
          margin: '1rem auto',
          padding: '1rem',
          background: '#ffe082',
          borderRadius: '8px',
          textAlign: 'center',
          width: '220px',
          minHeight: '140px'
        }}
      >
        {displayedWinner ? (
          <>
            <img
              src={`/images/${displayedWinner}.png`}
              alt={displayedWinner}
              style={{ width: '100px', height: '100px', objectFit: 'contain' }}
            />
            <p
              style={{
                margin: '0.5rem 0',
                fontWeight: 'bold',
                fontSize: '1.2rem'
              }}
            >
              🎉 {displayedWinner.toUpperCase()} 🎉
            </p>
          </>
        ) : (
          <p style={{ margin: '0', color: '#555' }}>Waiting for winner...</p>
        )}
      </div>
      {/* Last 10 Wins Section */}
      <div className="last-wins">
        <h4>📜 Last 10 Wins</h4>
        <ul>
          {lastWins.map((w, i) => (
            <li key={i}>{w.toUpperCase()}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
