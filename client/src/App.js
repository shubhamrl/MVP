import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/DashboardPage';
import TBGamePage from './pages/TBGamePage';
import SpinGamePage from './pages/SpinGamePage';

function App() {
  const token = localStorage.getItem('token');
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={token ? <UserDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={token ? <AdminDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/game/tb"
          element={token ? <TBGamePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/game/spin"
          element={token ? <SpinGamePage /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;