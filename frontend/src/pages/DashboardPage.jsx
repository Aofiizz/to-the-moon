import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, RefreshCw, Landmark, HeartHandshake, ListTodo, Check, X, ShieldAlert } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001';

function DashboardPage({ token, setToken, handleLogout }) {
  // Login states
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState(null);
  const [donations, setDonations] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // ID of donation being approved
  const [fetchError, setFetchError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return;

    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      localStorage.setItem('adminToken', data.token);
      setToken(data.token);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!token) return;
    setDataLoading(true);
    setFetchError('');

    try {
      // Fetch stats
      const statsRes = await fetch(`${BACKEND_URL}/api/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!statsRes.ok) throw new Error('ไม่สามารถดึงข้อมูลสถิติได้');
      const statsData = await statsRes.json();

      // Fetch donations list
      const donationsRes = await fetch(`${BACKEND_URL}/api/donations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!donationsRes.ok) throw new Error('ไม่สามารถดึงประวัติการบริจาคได้');
      const donationsData = await donationsRes.json();

      setStats(statsData);
      setDonations(donationsData);
    } catch (err) {
      setFetchError(err.message);
      // If unauthorized, clear token
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        handleLogout();
      }
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const handleManualConfirm = async (donationId) => {
    if (!token) return;
    setActionLoading(donationId);

    try {
      const response = await fetch(`${BACKEND_URL}/api/donations/${donationId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'อนุมัติรายการไม่สำเร็จ');
      }

      // Refresh data
      await fetchDashboardData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const [testSender, setTestSender] = useState('ผู้สนับสนุนทดสอบ');
  const [testAmount, setTestAmount] = useState('100');
  const [testMessage, setTestMessage] = useState('ยินดีด้วย! ระบบแจ้งเตือนสำเร็จและ TTS ทำงานได้สมบูรณ์ครับ');
  const [testAlertLoading, setTestAlertLoading] = useState(false);

  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');

  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        const thVoices = voices.filter(v => v.lang === 'th-TH' || v.lang.startsWith('th') || v.lang.includes('th'));
        setAvailableVoices(thVoices);
        if (thVoices.length > 0) {
          // Default to first voice if not set
          setSelectedVoiceName(prev => prev || thVoices[0].name);
        }
      }
    };
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleSendTestAlert = async (e) => {
    e.preventDefault();
    if (!token) return;
    setTestAlertLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/test-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          senderName: testSender,
          amount: testAmount,
          message: testMessage,
          voiceName: selectedVoiceName
        })
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถส่งคำขอทดสอบได้');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setTestAlertLoading(false);
    }
  };

  const handleLocalTestTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = testMessage.replace(/฿/g, '');
      const utterance = new SpeechSynthesisUtterance(text);
      
      const voice = availableVoices.find(v => v.name === selectedVoiceName);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else if (availableVoices.length > 0) {
        const fallback = availableVoices.find(v => v.name.includes('Siri') || v.name.includes('Pattara')) || availableVoices[0];
        utterance.voice = fallback;
        utterance.lang = fallback.lang;
      } else {
        utterance.lang = 'th-TH';
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      alert('เบราว์เซอร์นี้ไม่รองรับการสังเคราะห์เสียง');
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  // --- 1. LOGIN VIEW ---
  if (!token) {
    return (
      <div className="glass-panel animate-fade-in-up" style={{ maxWidth: '450px', margin: '60px auto', padding: '35px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255, 107, 0, 0.1)', padding: '12px', borderRadius: '50%', marginBottom: '15px' }}>
            <ShieldCheck size={32} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Admin Authentication</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '5px' }}>
            กรุณาเข้าสู่ระบบเพื่อจัดการประวัติและระบบโดเนท
          </p>
        </div>

        {loginError && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--error)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: '0.85rem'
          }}>
            <ShieldAlert size={18} />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Username แอดมิน..." 
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="รหัสผ่าน..." 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loginLoading}
          >
            {loginLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    );
  }

  // --- 2. MAIN DASHBOARD VIEW ---
  return (
    <div className="animate-fade-in-up">
      {/* Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            ติดตาม ยอดการสนับสนุน และตรวจสอบประวัติการทำรายการแบบเรียลไทม์
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchDashboardData}
            disabled={dataLoading}
            style={{ padding: '10px 15px' }}
          >
            <RefreshCw size={18} className={dataLoading ? 'animate-spin' : ''} />
            {dataLoading ? 'กำลังรีเฟรช...' : 'รีเฟรช'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleLogout}
            style={{ padding: '10px 15px', color: 'var(--error)' }}
          >
            <LogOut size={18} />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {fetchError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--error)',
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '25px'
        }}>
          {fetchError}
        </div>
      )}

      {/* Stats Counter Row */}
      {stats && (
        <div className="stats-grid">
          <div className="glass-panel stat-card">
            <div className="stat-info">
              <h3>ยอดเงินสนับสนุนทั้งหมด</h3>
              <p>฿{stats.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="stat-icon">
              <Landmark size={24} />
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-info">
              <h3>จำนวนคนบริจาคสำเร็จ</h3>
              <p>{stats.totalCount} รายการ</p>
            </div>
            <div className="stat-icon">
              <HeartHandshake size={24} />
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-info">
              <h3>ช่องทางการชำระเงิน</h3>
              <p style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '8px' }}>
                PromptPay: {stats.methods.PROMPTPAY} | TrueWallet: {stats.methods.TRUEWALLET}
              </p>
            </div>
            <div className="stat-icon">
              <ListTodo size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Two-Column Layout */}
      <div className="dashboard-layout">
        {/* Left Column: Recent Transactions */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <h2 className="section-title">
            <ListTodo size={20} color="var(--primary)" /> รายการบริจาคล่าสุด
          </h2>

          {dataLoading && donations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>กำลังโหลดข้อมูล...</p>
          ) : donations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>ยังไม่มีผู้สนับสนุน ณ ขณะนี้</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ผู้บริจาค</th>
                    <th>ข้อความ</th>
                    <th>จำนวนเงิน</th>
                    <th>ช่องทาง</th>
                    <th>สถานะ</th>
                    <th>เวลา</th>
                    <th>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.senderName}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: d.message ? 'var(--text-main)' : 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.message}>
                          {d.message || '-'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>฿{d.amount.toFixed(2)}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{d.paymentMethod}</span>
                      </td>
                      <td>
                        <span className={`badge ${d.status === 'SUCCESS' ? 'badge-success' : 'badge-pending'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(d.createdAt)}</div>
                      </td>
                      <td>
                        {d.status === 'PENDING' ? (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: '0.8rem', borderRadius: '4px' }}
                            onClick={() => handleManualConfirm(d.id)}
                            disabled={actionLoading === d.id}
                          >
                            <Check size={14} />
                            {actionLoading === d.id ? 'อนุมัติ...' : 'อนุมัติมือ'}
                          </button>
                        ) : (
                          <div style={{ display: 'inline-flex', color: 'var(--success)', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                            <Check size={14} /> สำเร็จแล้ว
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Top Donators */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <h2 className="section-title">
            🏆 Top Support (ผู้สนับสนุนสูงสุด)
          </h2>

          {stats && stats.topDonators && stats.topDonators.length > 0 ? (
            <div className="top-donators-list">
              {stats.topDonators.map((donator, index) => (
                <div className="top-donator-item" key={donator.senderName}>
                  <div className="donator-rank-name">
                    <div className={`donator-rank donator-rank-${index + 1}`}>
                      {index + 1}
                    </div>
                    <div className="donator-name">{donator.senderName}</div>
                  </div>
                  <div className="donator-amount">฿{donator.totalAmount.toLocaleString('th-TH')}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>ยังไม่มีข้อมูลผู้สนับสนุน</p>
          )}

          {/* Test Tools Panel */}
          <div style={{
            marginTop: '25px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-md)',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔧 ทดสอบระบบแจ้งเตือน & เสียง
            </h3>
            
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>ชื่อจำลอง</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ padding: '8px 12px', fontSize: '0.85rem' }} 
                value={testSender}
                onChange={(e) => setTestSender(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>จำนวนเงิน (บาท)</label>
              <input 
                type="number" 
                className="form-input" 
                style={{ padding: '8px 12px', fontSize: '0.85rem' }} 
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>ข้อความจำลอง</label>
              <textarea 
                className="form-input" 
                style={{ padding: '8px 12px', fontSize: '0.85rem', resize: 'vertical' }} 
                rows="2"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>

            {availableVoices.length > 1 && (
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>เสียง AI ภาษาไทย (เลือกทดสอบ)</label>
                <select
                  className="form-input"
                  style={{ padding: '8px 12px', fontSize: '0.85rem', background: 'rgba(15, 23, 42, 0.9)' }}
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                >
                  {availableVoices.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ padding: '10px', fontSize: '0.85rem', width: '100%' }}
                onClick={handleSendTestAlert}
                disabled={testAlertLoading}
              >
                🚀 ยิงขึ้นจอสตรีม (OBS Overlay)
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '10px', fontSize: '0.85rem', width: '100%' }}
                onClick={handleLocalTestTTS}
              >
                🔊 ทดลองฟังเสียงอ่านเครื่องนี้
              </button>
            </div>
          </div>

          <div style={{
            marginTop: '25px',
            padding: '15px',
            background: 'rgba(0, 240, 255, 0.02)',
            border: '1px solid rgba(0, 240, 255, 0.05)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            lineHeight: '1.5'
          }}>
            <p style={{ fontWeight: 600, color: 'var(--cyan)', marginBottom: '5px' }}>💡 เคล็ดลับการไลฟ์สตรีม:</p>
            <span>นำลิงก์หน้านี้ใส่ใน Web Browser Source ของ OBS หรือสลับเปิดจอที่สองเพื่อความสะดวกในการจัดการ และใช้หน้า Overlay ในการแสดงผลอนิเมชั่น</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
