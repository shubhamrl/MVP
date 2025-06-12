import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import api from '../services/api';
import '../styles/dashboard.css';

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

// === WhatsApp Settings component ===
const WhatsappSettings = () => {
  const [deposit, setDeposit] = useState('');
  const [withdraw, setWithdraw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/settings')
      .then(res => {
        setDeposit(res.data?.depositWhatsapp || '');
        setWithdraw(res.data?.withdrawWhatsapp || '');
      });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/settings', {
        depositWhatsapp: deposit,
        withdrawWhatsapp: withdraw
      });
      setMsg('Updated!');
    } catch {
      setMsg('Failed');
    }
    setLoading(false);
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: 8, background: '#f9f9f9' }}>
      <h2>WhatsApp Number Settings</h2>
      <div style={{ marginBottom: '1rem' }}>
        <label>Deposit WhatsApp: </label>
        <input value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="Deposit Number" style={{ marginRight: 8 }} />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Withdraw WhatsApp: </label>
        <input value={withdraw} onChange={e => setWithdraw(e.target.value)} placeholder="Withdraw Number" style={{ marginRight: 8 }} />
      </div>
      <button onClick={handleSave} disabled={loading}>Save</button>
      <span style={{ marginLeft: 10, color: msg === 'Updated!' ? 'green' : 'red' }}>{msg}</span>
    </section>
  );
};

const DashboardPage = () => {
  const [deposits, setDeposits]       = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [betsData, setBetsData] = useState({ round: '', totals: {} });
  const [users, setUsers]             = useState([]);
  const [editAmounts, setEditAmounts] = useState({});
  const [searchTerm, setSearchTerm]   = useState('');
  const [lastWins, setLastWins] = useState(() => {
    const stored = JSON.parse(localStorage.getItem('tbLastWins') || '[]');
    return Array.isArray(stored) ? stored : [];
  });

  // Real-time state (from /live-state)
  const [currentRound, setCurrentRound] = useState(1);
  const [timer, setTimer] = useState(90);
  const [totals, setTotals] = useState({});
  const [winnerChoice, setWinnerChoice] = useState(null);

  // ===== Auto-refresh all important data every second =====
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const res = await api.get('/bets/live-state');
        setCurrentRound(res.data.round);
        setTimer(res.data.timer);
        setTotals(res.data.totals || {});
        setWinnerChoice(res.data.winnerChoice || null);
      } catch (err) {
        console.error("Error fetching live-state:", err);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 1000);
    return () => clearInterval(interval);
  }, []);

  // These fetches as before
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ depRes, witRes ] = await Promise.all([
          api.get('/deposits'),
          api.get('/withdrawals'),
        ]);
        setDeposits(depRes.data.deposits);
        setWithdrawals(witRes.data.withdrawals);
      } catch (err) {
        console.error('Error fetching admin data:', err);
      }
    };
    fetchAll();
  }, []);

  const fetchUsers = async (search = '') => {
    try {
      const params = search.trim() ? { search } : {};
      const res = await api.get('http://localhost:5000/api/admin/users', { params });
      const data = res.data;
      const list = Array.isArray(data) ? data : data.users || [];
      setUsers(list);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = () => { fetchUsers(searchTerm); };
  const handleBalanceChange = (id, value) => { setEditAmounts(prev => ({ ...prev, [id]: value })); };
  const updateBalance = async (id, isAdd) => {
    try {
      const val = Number(editAmounts[id] || 0);
      const amount = isAdd ? val : -val;
      const res = await api.put(`/admin/users/${id}/balance`, { amount });
      setUsers(users.map(u =>
        u._id === id ? { ...u, balance: res.data.balance } : u
      ));
      alert(`Balance updated: ₹${res.data.balance}`);
      setEditAmounts(prev => ({ ...prev, [id]: '' }));
    } catch (err) {
      console.error('Error updating balance:', err);
      alert('Error updating balance');
    }
  };

  const fetchLastWins = () => {
    const stored = JSON.parse(localStorage.getItem('tbLastWins') || '[]');
    setLastWins(Array.isArray(stored) ? stored : []);
  };

  // ===== Winner set logic (admin) — payout/winner announcement on user timer only =====
  const handleSetWinner = async (choice) => {
    try {
      await api.post('/bets/set-winner', { choice, round: currentRound });
      alert(`Winner set: ${choice} (Payout will run when user timer 0)`);
    } catch (err) {
      console.error('Error setting winner:', err);
      alert('Error setting winner');
    }
  };

  useEffect(() => {
    fetchLastWins();
    socket.on('bet-placed', fetchLastWins);
    socket.on('winner-announced', fetchLastWins);
    socket.on('payouts-distributed', fetchLastWins);

    return () => {
      socket.off('bet-placed', fetchLastWins);
      socket.off('winner-announced', fetchLastWins);
      socket.off('payouts-distributed', fetchLastWins);
      socket.disconnect();
    };
  }, []);

  return (
    <div className="admin-dashboard-container" style={{ padding: '2rem' }}>
      <h1>Admin Dashboard</h1>
      <WhatsappSettings />
      {/* ===== Current Round Section ===== */}
      <section className="current-round-section" style={{ marginTop: '2rem' }}>
        <h2>
          Current Round: {currentRound} | ⏱️ {timer}s left
        </h2>
        <div className="admin-image-grid">
          {IMAGE_LIST.map(item => {
            const amount = totals[item.name] || 0;
            return (
              <div key={item.name} className="admin-card">
                <img
                  src={item.src}
                  alt={item.name}
                  className="admin-card-image"
                />
                <p className="admin-card-name">{item.name}</p>
                <p className="admin-card-bet">₹{amount}</p>
                <button
                  className="admin-card-button"
                  onClick={() => handleSetWinner(item.name)}
                >
                  Set Winner
                </button>
              </div>
            );
          })}
        </div>
        {winnerChoice && <p style={{color:"green",fontWeight:"bold"}}>Set Winner: {winnerChoice.toUpperCase()}</p>}
      </section>
      {/* ===== Search Users ===== */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Search Users</h2>
        <input
          type="text"
          placeholder="Enter user ID or email"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginRight: '0.5rem', padding: '0.5rem' }}
        />
        <button onClick={handleSearch}>Search</button>
      </section>
      {/* ===== Manage User Balances ===== */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Manage User Balances</h2>
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Balance</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.email}</td>
                <td>₹{user.balance}</td>
                <td>
                  <input
                    type="number"
                    value={editAmounts[user._id] || ''}
                    onChange={e => handleBalanceChange(user._id, e.target.value)}
                    placeholder="₹"
                    style={{ width: '80px', padding: '0.25rem' }}
                  />
                </td>
                <td>
                  <button onClick={() => updateBalance(user._id, true)}>Add</button>{' '}
                  <button onClick={() => updateBalance(user._id, false)}>Minus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {/* ===== Last 10 Wins Section ===== */}
      <section className="last-wins-section" style={{ marginTop: '2rem' }}>
        <h2>Last 10 Wins</h2>
        <ul className="last-wins-list">
          {lastWins.map((winChoice, idx) => (
            <li key={idx}>{winChoice.toUpperCase()}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default DashboardPage;
