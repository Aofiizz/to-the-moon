import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:3001`;

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

function OverlayPage() {
  const [currentAlert, setCurrentAlert] = useState(null);
  const [active, setActive] = useState(false);
  const [voices, setVoices] = useState([]);
  
  const alertQueue = useRef([]);
  const isProcessing = useRef(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // 1. Connect to backend socket
    socketRef.current = io(BACKEND_URL);

    socketRef.current.on('connect', () => {
      console.log('Overlay connected to socket server!');
    });

    socketRef.current.on('donation_received', (donation) => {
      console.log('Received donation event:', donation);
      // Add to queue
      alertQueue.current.push(donation);
      
      // Start processing if not currently doing so
      if (!isProcessing.current) {
        processQueue();
      }
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const playSoundAlert = (amount) => {
    let soundUrl = '/sounds/level1.mp3'; // น้าค่อม: ไม่ได้แดกกูหรอก (< 20 Baht)
    
    if (amount >= 100) {
      soundUrl = '/sounds/level4.mp3'; // น้าค่อม: ไอ้สัส! ยอดฮิต (>= 100 Baht)
    } else if (amount >= 50) {
      soundUrl = '/sounds/level3.mp3'; // น้าค่อม: หัวเราะสะใจกวนๆ (>= 50 Baht)
    } else if (amount >= 20) {
      soundUrl = '/sounds/level2.mp3'; // น้าค่อม: อุบ๊ะ! (>= 20 Baht)
    }

    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.8;
      audio.play().catch(e => console.log('Audio playback delayed or blocked by browser:', e));
    } catch (err) {
      console.log('Failed to play audio alert:', err);
    }
  };

  const processQueue = () => {
    if (alertQueue.current.length === 0) {
      isProcessing.current = false;
      return;
    }

    isProcessing.current = true;
    const nextAlert = alertQueue.current.shift();
    setCurrentAlert(nextAlert);
    
    // Trigger animation in
    setActive(true);

    // Play Sound Alert based on amount
    playSoundAlert(nextAlert.amount);

    // Trigger Text-to-Speech (TTS) after a 1.2 second delay (so sound plays first)
    setTimeout(() => {
      speakDonation(nextAlert);
    }, 1200);

    // Keep it on screen for 7 seconds, then animate out
    setTimeout(() => {
      setActive(false);
      
      // Wait for exit animation to complete (500ms) before loading next alert
      setTimeout(() => {
        setCurrentAlert(null);
        processQueue();
      }, 500);
    }, 7000);
  };

  const speakDonation = (donation) => {
    if ('speechSynthesis' in window && donation.message && donation.message.trim()) {
      // Create speech script in Thai (read message only, strip ฿ symbol)
      const textToSpeak = donation.message.replace(/฿/g, '');
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'th-TH';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Find Thai voice: 1st priority = donation choice, 2nd priority = URL parameter
      const params = new URLSearchParams(window.location.search);
      const queryVoice = params.get('voice');
      const chosenVoiceName = (donation.voiceName && donation.voiceName !== 'default') ? donation.voiceName : queryVoice;

      const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      const thaiVoices = currentVoices.filter(voice => voice.lang === 'th-TH' || voice.lang.startsWith('th') || voice.lang.includes('th'));
      
      let selectedVoice = findThaiVoice(chosenVoiceName, thaiVoices);
      
      if (!selectedVoice && thaiVoices.length > 0) {
        // Fallback: prefer Siri/Pattara online high quality voices if present
        selectedVoice = thaiVoices.find(voice => voice.name.includes('Siri') || voice.name.includes('Pattara')) || thaiVoices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        console.log('Overlay TTS Voice chosen:', selectedVoice.name);
      }

      window.speechSynthesis.speak(utterance);
    } else {
      console.log('Web Speech API (TTS) not supported in this browser.');
    }
  };

  // Pre-load voices (Chrome/Webkit compatibility)
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

  return (
    <div className="overlay-container">
      {/* Test Connection Indicator (Will show temporarily and fade out, helpful for streamers) */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.2)',
        fontFamily: 'monospace'
      }}>
        To The Moon Overlay: Connected
      </div>

      {currentAlert && (
        <div className={`alert-box ${active ? 'active' : ''}`}>
          <div className="alert-icon">🚀</div>
          <div className="alert-title">สนับสนุนรายการ</div>
          <div className="alert-name">{currentAlert.senderName}</div>
          <div className="alert-amount">฿{currentAlert.amount.toFixed(2)}</div>
          {currentAlert.message && (
            <div className="alert-message">
              {currentAlert.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OverlayPage;
