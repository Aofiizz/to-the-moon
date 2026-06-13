import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3001';

function GoalPage() {
  const [goalData, setGoalData] = useState({
    title: 'เป้าหมายโดเนท',
    target: 5000,
    current: 0
  });
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  // Fetch initial goal data
  useEffect(() => {
    const fetchGoal = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/goal`);
        if (!res.ok) throw new Error('Failed to fetch goal data');
        const data = await res.json();
        setGoalData(data);
      } catch (err) {
        console.error('Error fetching goal:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoal();
  }, []);

  // Listen for real-time donations to update progress
  useEffect(() => {
    socketRef.current = io(BACKEND_URL);

    socketRef.current.on('donation_received', (donation) => {
      console.log('Real-time donation received in Goal Widget:', donation);
      setGoalData((prev) => ({
        ...prev,
        current: prev.current + donation.amount
      }));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  if (loading) {
    return (
      <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'sans-serif', fontSize: '0.8rem', padding: '10px' }}>
        กำลังโหลดเป้าหมาย...
      </div>
    );
  }

  const percentage = Math.min(Math.round((goalData.current / goalData.target) * 100), 100);

  return (
    <div style={{
      width: '100%',
      maxWidth: '600px',
      padding: '20px',
      background: 'rgba(8, 10, 16, 0.85)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 107, 0, 0.05)',
      fontFamily: "'Inter', 'Sarabun', sans-serif",
      color: '#fff',
      boxSizing: 'border-box'
    }}>
      {/* Top row: Title and current status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: '12px'
      }}>
        <div style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.3px',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {goalData.title}
        </div>
        <div style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'var(--cyan, #00f0ff)'
        }}>
          ฿{goalData.current.toLocaleString()} / ฿{goalData.target.toLocaleString()} ({percentage}%)
        </div>
      </div>

      {/* Progress Bar Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '24px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)'
      }}>
        {/* Glow effect on the bar fill */}
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #ff6b00 0%, #8a2be2 100%)',
          borderRadius: '12px',
          transition: 'width 1.2s cubic-bezier(0.1, 0.8, 0.2, 1)',
          position: 'relative',
          boxShadow: '0 0 10px rgba(255, 107, 0, 0.5)'
        }}>
          {/* Animated scanning light effect on bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            animation: 'scan-light 2.5s infinite linear',
            backgroundSize: '200% 100%'
          }} />
        </div>
      </div>
      
      {/* Keyframes style tag */}
      <style>{`
        @keyframes scan-light {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export default GoalPage;
