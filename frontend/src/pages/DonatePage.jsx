import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, ShieldAlert, Heart, Coins, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

const BACKEND_URL = 'http://localhost:3001';

const findThaiVoice = (voiceKey, thaiVoices) => {
  if (!voiceKey || voiceKey === 'default' || thaiVoices.length === 0) {
    return null;
  }
  
  const key = voiceKey.toLowerCase();
  
  // 1. Try exact/substring match of the key
  let match = thaiVoices.find(v => v.name.toLowerCase().includes(key));
  if (match) return match;
  
  // 2. Smart fallbacks based on gender/style
  if (key === 'kanya' || key === 'narayisa') {
    // These are female voices. Try to find Achara (Windows female) or Google
    match = thaiVoices.find(v => v.name.toLowerCase().includes('achara'));
    if (match) return match;
    match = thaiVoices.find(v => v.name.toLowerCase().includes('google'));
    if (match) return match;
    // Fallback to anything that is NOT Pattara (since Pattara is male)
    match = thaiVoices.find(v => !v.name.toLowerCase().includes('pattara'));
    if (match) return match;
  } else if (key === 'pattara') {
    // This is male. Try to find Pattara
    match = thaiVoices.find(v => v.name.toLowerCase().includes('pattara'));
    if (match) return match;
  } else if (key === 'google') {
    // Google voice. Try Google, otherwise Kanya or Achara or first voice
    match = thaiVoices.find(v => v.name.toLowerCase().includes('google'));
    if (match) return match;
    match = thaiVoices.find(v => v.name.toLowerCase().includes('kanya'));
    if (match) return match;
    match = thaiVoices.find(v => v.name.toLowerCase().includes('achara'));
    if (match) return match;
  }
  
  return null;
};

function DonatePage() {
  const [step, setStep] = useState(1); // 1: Form, 2: Payment/QR, 3: Success
  const [formData, setFormData] = useState({
    senderName: '',
    message: '',
    amount: '',
    paymentMethod: 'PROMPTPAY',
    voiceName: 'default'
  });
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);
  
  // Verification states
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const presets = [20, 50, 100, 300, 500, 1000];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePresetSelect = (amount) => {
    setFormData(prev => ({ ...prev, amount: amount.toString() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.senderName.trim()) {
      setError('กรุณากรอกชื่อผู้ส่ง');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setError('กรุณากรอกจำนวนเงินให้ถูกต้อง (มากกว่า 0)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'มีบางอย่างผิดพลาด');
      }

      setDonation(data.donation);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSlipFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSlipFile(e.target.files[0]);
    }
  };

  const handleVerify = async () => {
    if (!slipFile) {
      setError('กรุณาอัปโหลดสลิปเพื่อยืนยัน');
      return;
    }

    setVerifyLoading(true);
    setError('');

    const verifyFormData = new FormData();
    verifyFormData.append('slip', slipFile);

    try {
      const response = await fetch(`${BACKEND_URL}/api/donations/${donation.id}/verify`, {
        method: 'POST',
        body: verifyFormData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'การตรวจสอบสลิปล้มเหลว');
      }

      // Success
      setStep(3);
      triggerConfetti();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const triggerConfetti = () => {
    // Launch a premium confetti explosion
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ff6b00', '#8a2be2', '#00f0ff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ff6b00', '#8a2be2', '#00f0ff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handleTestTTS = () => {
    if (!formData.message.trim()) {
      alert('กรุณากรอกข้อความเพื่อทดสอบฟังเสียงครับ');
      return;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const testText = formData.message.replace(/฿/g, '');
      const utterance = new SpeechSynthesisUtterance(testText);
      
      const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      const thaiVoices = currentVoices.filter(voice => voice.lang === 'th-TH' || voice.lang.startsWith('th') || voice.lang.includes('th'));
      
      let selectedVoice = findThaiVoice(formData.voiceName, thaiVoices);
      
      if (!selectedVoice && thaiVoices.length > 0) {
        selectedVoice = thaiVoices.find(voice => voice.name.includes('Siri') || voice.name.includes('Pattara')) || thaiVoices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = 'th-TH';
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      window.speechSynthesis.speak(utterance);
    } else {
      alert('อุปกรณ์ของคุณไม่รองรับการสังเคราะห์เสียงในเบราว์เซอร์');
    }
  };

  const resetForm = () => {
    setFormData({
      senderName: '',
      message: '',
      amount: '',
      paymentMethod: 'PROMPTPAY',
      voiceName: 'default'
    });
    setDonation(null);
    setSlipFile(null);
    setStep(1);
    setError('');
  };

  return (
    <div className="animate-fade-in-up">
      {/* Decorative header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="gradient-text-accent" style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '10px' }}>
          สนับสนุนสตรีมเมอร์ที่คุณรัก 🚀
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
          ส่งกำลังใจพร้อมข้อความแสดงบนหน้าจอและอ่านออกเสียงทันที
        </p>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--error)',
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px',
          fontSize: '0.95rem'
        }}>
          <ShieldAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <div className="donate-layout">
          {/* Left panel: Info & Form */}
          <div className="glass-panel donate-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins color="var(--primary)" /> รายละเอียดผู้บริจาค
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">ชื่อผู้สนับสนุน *</label>
                <input 
                  type="text" 
                  name="senderName"
                  className="form-input" 
                  placeholder="กรอกชื่อของคุณ..." 
                  value={formData.senderName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">จำนวนเงินบริจาค (บาท) *</label>
                <input 
                  type="number" 
                  name="amount"
                  className="form-input" 
                  placeholder="กรอกจำนวนเงิน..." 
                  value={formData.amount}
                  onChange={handleInputChange}
                  min="1"
                  step="any"
                  required
                />
              </div>

              {/* Preset buttons */}
              <div className="preset-amounts">
                {presets.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`preset-btn ${formData.amount === amt.toString() ? 'active' : ''}`}
                    onClick={() => handlePresetSelect(amt)}
                  >
                    ฿{amt}
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">เลือกสไตล์เสียง AI (เลือกได้)</label>
                <select
                  name="voiceName"
                  className="form-input"
                  value={formData.voiceName}
                  onChange={handleInputChange}
                  style={{ background: 'rgba(15, 23, 42, 0.9)' }}
                >
                  <option value="default">เสียงหลักของสตรีมเมอร์ (Default)</option>
                  <option value="kanya">เสียงผู้หญิงมาตรฐาน (Kanya)</option>
                  <option value="pattara">เสียงผู้ชายอบอุ่น (Siri Pattara)</option>
                  <option value="narayisa">เสียงผู้หญิงนุ่มนวล (Siri Narayisa)</option>
                  <option value="google">เสียงเป็นธรรมชาติ (Google Thai)</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  🔊 เสียงภาษาไทยที่ตรวจพบในเครื่องนี้: {
                    ((voices.length > 0 ? voices : (typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.getVoices() : []))
                      .filter(v => v.lang.startsWith('th') || v.lang.includes('th') || v.lang === 'th-TH')
                      .map(v => v.name)
                      .join(', ')) || 'ไม่พบเสียงภาษาไทย (จะใช้เสียงหลัก)'
                  }
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ข้อความถึงสตรีมเมอร์ (เลือกได้)</label>
                <textarea 
                  name="message"
                  className="form-input" 
                  placeholder="พิมพ์ข้อความของคุณที่นี่ (จะถูกนำไปอ่านออกเสียงด้วย AI)..." 
                  value={formData.message}
                  onChange={handleInputChange}
                  rows="3"
                  style={{ resize: 'vertical' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: '8px', padding: '6px 12px', fontSize: '0.85rem', width: 'fit-content', alignSelf: 'flex-start' }}
                  onClick={handleTestTTS}
                >
                  🔊 ทดลองฟังเสียงอ่านข้อความ
                </button>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '10px' }}
                disabled={loading}
              >
                {loading ? 'กำลังสร้างรายการ...' : 'ดำเนินการต่อ'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          </div>

          {/* Right panel: Payment selection */}
          <div className="glass-panel donate-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart color="var(--secondary)" /> วิธีการชำระเงิน
            </h2>

            <div className="payment-method-selector">
              <div 
                className={`payment-option ${formData.paymentMethod === 'PROMPTPAY' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'PROMPTPAY' }))}
              >
                <img src="https://promptpay.io/register.png" alt="PromptPay" style={{ height: '20px' }} />
                <span>PromptPay QR</span>
              </div>
              <div 
                className={`payment-option ${formData.paymentMethod === 'TRUEWALLET' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'TRUEWALLET' }))}
              >
                <img src="https://brandlogos.net/wp-content/uploads/2022/10/truemoney-wallet-logo.png" alt="TrueMoney" style={{ height: '20px' }} />
                <span>TrueWallet</span>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '10px', fontWeight: 600, color: 'var(--text-main)' }}>ℹ️ ข้อมูลการโอนเงิน:</p>
              <ul style={{ paddingLeft: '18px' }}>
                <li style={{ marginBottom: '6px' }}>ระบบ PromptPay ไม่มีขั้นต่ำ และไม่มีค่าธรรมเนียมใดๆ</li>
                <li>True Wallet จำลองการชำระเงินและมีระบบยืนยันสลิปเพื่อทดสอบความเสถียร</li>
              </ul>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="glass-panel donate-card" style={{ marginTop: '25px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📺 ตัวอย่างการแสดงผลบนจอไลฟ์
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px' }}>
              นี่คือตัวอย่างป๊อปอัปแจ้งเตือนที่จะเด้งโชว์บนหน้าจอของสตรีมเมอร์เมื่อคุณโอนเงินสำเร็จ
            </p>
            
            {/* Alert Mockup */}
            <div style={{
              background: 'rgba(10, 12, 18, 0.95)',
              border: '2px solid var(--primary)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: '0 0 20px var(--primary-glow)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              width: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🚀</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>สนับสนุนรายการ</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '4px', wordBreak: 'break-word', width: '100%' }}>
                {formData.senderName || 'ชื่อของคุณ'}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '10px' }}>
                ฿{formData.amount ? parseFloat(formData.amount).toFixed(2) : '0.00'}
              </div>
              <div style={{
                fontSize: '0.9rem',
                padding: '10px 15px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--cyan)',
                width: '100%',
                textAlign: 'left',
                wordBreak: 'break-word',
                minHeight: '40px',
                fontStyle: formData.message ? 'normal' : 'italic',
                color: formData.message ? 'var(--text-main)' : 'var(--text-muted)'
              }}>
                {formData.message || 'ข้อความสนับสนุนของคุณจะแสดงตรงนี้...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && donation && (
        <div className="glass-panel donate-card" style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '10px' }}>สแกน QR Code เพื่อสนับสนุน</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>
            สแกนจ่ายด้วยแอปธนาคารใดก็ได้ จากนั้นนำภาพสลิปที่ได้มาอัปโหลดด้านล่าง
          </p>

          <div className="qrcode-container">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/d/d0/PromptPay-logo.png" 
              className="pp-logo" 
              alt="PromptPay Logo" 
            />
            {donation.qrCodeUrl ? (
              <img 
                src={donation.qrCodeUrl} 
                className="qrcode-image" 
                alt="Donation QR Code" 
              />
            ) : (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                [ TrueWallet QR Code Sim ]
              </div>
            )}
            <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.25rem' }}>
              ยอดโอน: ฿{donation.amount.toFixed(2)}
            </div>
          </div>

          <div style={{ marginBottom: '25px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '10px' }}>อัปโหลดสลิปเพื่อยืนยันรายการ</h3>
            
            <div 
              className={`file-upload-zone ${dragActive ? 'active' : ''} ${slipFile ? 'pulse-glow' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('slip-input').click()}
            >
              <input 
                id="slip-input"
                type="file" 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={handleFileChange}
              />
              <UploadCloud size={32} className="file-upload-icon" style={{ margin: '0 auto 10px auto' }} />
              {slipFile ? (
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--primary)' }}>เลือกสลิปแล้ว: {slipFile.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>คลิกหรือลากไฟล์มาใส่เพื่อเปลี่ยนรูปสลิป</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: 600 }}>คลิก หรือ ลากไฟล์รูปภาพสลิปมาวางที่นี่</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>รองรับไฟล์ PNG, JPG, JPEG เท่านั้น</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={resetForm}
              style={{ flex: 1 }}
              disabled={verifyLoading}
            >
              ยกเลิก
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleVerify}
              style={{ flex: 2 }}
              disabled={verifyLoading || !slipFile}
            >
              {verifyLoading ? 'กำลังตรวจสอบสลิป...' : 'ตรวจสอบและส่งโดเนท'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && donation && (
        <div className="glass-panel donate-card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: '50%', marginBottom: '20px' }}>
            <CheckCircle2 size={48} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '10px' }}>สนับสนุนสำเร็จ! 🎉</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '25px', lineHeight: '1.6' }}>
            ขอบคุณคุณ <strong>{donation.senderName}</strong> เป็นอย่างสูงสำหรับการบริจาคจำนวน <strong>฿{donation.amount.toFixed(2)}</strong> ข้อความของคุณจะแสดงบนหน้าจอไลฟ์สตรีมทันที!
          </p>

          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: '30px',
            textAlign: 'left'
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>ข้อความของคุณ:</p>
            <p style={{ fontWeight: 500, fontStyle: donation.message ? 'normal' : 'italic', color: donation.message ? 'var(--text-main)' : 'var(--text-muted)' }}>
              {donation.message || 'ไม่มีข้อความ'}
            </p>
          </div>

          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={resetForm}
            style={{ width: '100%' }}
          >
            ส่งโดเนทเพิ่ม
          </button>
        </div>
      )}
    </div>
  );
}

export default DonatePage;
