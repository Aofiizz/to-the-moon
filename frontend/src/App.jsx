import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { Rocket, LayoutDashboard, HeartHandshake, MonitorPlay } from 'lucide-react';
import DonatePage from './pages/DonatePage';
import DashboardPage from './pages/DashboardPage';
import OverlayPage from './pages/OverlayPage';
import GoalPage from './pages/GoalPage';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken('');
  };

  return (
    <Router>
      <Routes>
        {/* The overlay is designed to be borderless and transparent, so it shouldn't have a navbar */}
        <Route path="/overlay" element={<OverlayPage />} />
        <Route path="/goal" element={<GoalPage />} />
        
        {/* Other pages have the beautiful space navbar */}
        <Route 
          path="/*" 
          element={
            <div className="app-container">
              <nav className="navbar">
                <div className="nav-logo">
                  <Rocket size={24} color="var(--primary)" />
                  <span className="gradient-text">To The Moon</span>
                </div>
                <div className="nav-links">
                  <NavLink 
                    to="/" 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    end
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <HeartHandshake size={18} />
                      <span>โดเนท</span>
                    </div>
                  </NavLink>
                  <NavLink 
                    to="/dashboard" 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LayoutDashboard size={18} />
                      <span>แดชบอร์ดแอดมิน</span>
                    </div>
                  </NavLink>
                  <NavLink 
                    to="/overlay" 
                    target="_blank"
                    className="nav-link"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MonitorPlay size={18} />
                      <span>เปิด Alert (OBS)</span>
                    </div>
                  </NavLink>
                  <NavLink 
                    to="/goal" 
                    target="_blank"
                    className="nav-link"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MonitorPlay size={18} color="var(--primary)" />
                      <span>เปิด Goal Bar (OBS)</span>
                    </div>
                  </NavLink>
                </div>
              </nav>

              <main className="main-content">
                <Routes>
                  <Route path="/" element={<DonatePage />} />
                  <Route path="/dashboard" element={<DashboardPage token={token} setToken={setToken} handleLogout={handleLogout} />} />
                </Routes>
              </main>
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
