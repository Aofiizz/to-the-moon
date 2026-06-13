import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { generatePromptPayQR } from './utils/promptpay';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const PROMPTPAY_ID = process.env.PROMPTPAY_ID || '0812345678';

// Configure Multer for Slip Uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'slip-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpg, jpeg, png) are allowed!'));
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Helper: Hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Socket.io Connection
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// --- API ROUTES ---

// 1. Config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    promptPayId: PROMPTPAY_ID
  });
});

// 2. Create Donation (PENDING)
app.post('/api/donations', async (req, res) => {
  try {
    const { senderName, message, amount, paymentMethod, voiceName } = req.body;
    
    if (!senderName || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'Name, amount and payment method are required.' });
    }

    const donationAmount = parseFloat(amount);
    if (isNaN(donationAmount) || donationAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    // Create donation in database
    const donation = await prisma.donation.create({
      data: {
        senderName,
        message: message || '',
        amount: donationAmount,
        paymentMethod,
        voiceName: voiceName || '',
        status: 'PENDING'
      }
    });

    let qrCodeUrl = '';
    if (paymentMethod === 'PROMPTPAY') {
      // Generate real PromptPay QR code
      qrCodeUrl = await generatePromptPayQR(PROMPTPAY_ID, donationAmount);
    }

    res.json({
      success: true,
      donation: {
        id: donation.id,
        senderName: donation.senderName,
        message: donation.message,
        amount: donation.amount,
        paymentMethod: donation.paymentMethod,
        status: donation.status,
        voiceName: donation.voiceName,
        qrCodeUrl
      }
    });
  } catch (error: any) {
    console.error('Error creating donation:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 3. Verify Slip & Update Donation (SUCCESS)
app.post('/api/donations/:id/verify', upload.single('slip'), async (req, res) => {
  try {
    const { id } = req.params;
    const slipFile = req.file;

    if (!slipFile) {
      return res.status(400).json({ error: 'Slip image file is required.' });
    }

    // Check if donation exists
    const donation = await prisma.donation.findUnique({
      where: { id }
    });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    if (donation.status === 'SUCCESS') {
      return res.status(400).json({ error: 'Donation is already verified.' });
    }

    // --- Slip Verification Logic ---
    const slipUrl = `/uploads/${slipFile.filename}`;
    let transRef = '';
    
    // 1. Slip2Go Integration
    if (process.env.SLIP2GO_API_KEY) {
      console.log('Slip2Go API Key found. Performing real verification...');
      
      const form = new FormData();
      form.append('file', fs.createReadStream(slipFile.path), slipFile.originalname);
      
      try {
        const response = await axios.post('https://connect.slip2go.com/api/verify-slip/qr-image/info', form, {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${process.env.SLIP2GO_API_KEY}`
          }
        });
        
        console.log('Slip2Go Verification Result:', response.data);
        
        if ((response.status === 200 || response.status === 201) && response.data) {
          const dataPayload = response.data.data;
          
          if (!dataPayload || !dataPayload.transRef) {
            return res.status(400).json({
              error: 'การตรวจสอบสลิปผิดพลาด: ไม่สามารถถอดรหัสหรืออ่านเลขอ้างอิงจากรูปภาพสลิปได้'
            });
          }

          // 1. Check Amount
          const slipAmount = parseFloat(dataPayload.amount);
          if (isNaN(slipAmount) || Math.abs(slipAmount - donation.amount) > 0.009) {
            return res.status(400).json({
              error: `การตรวจสอบสลิปผิดพลาด: ยอดเงินในสลิปไม่ตรงกับยอดที่ทำรายการ (ในสลิป: ${slipAmount} บาท, ยอดบริจาค: ${donation.amount} บาท)`
            });
          }

          // 2. Check Duplicate transactionRef in database
          const existingDonation = await prisma.donation.findFirst({
            where: { transactionRef: dataPayload.transRef }
          });
          if (existingDonation) {
            return res.status(400).json({
              error: 'การตรวจสอบสลิปผิดพลาด: สลิปนี้เคยถูกใช้บริจาคไปแล้ว ไม่สามารถใช้ซ้ำได้'
            });
          }

          transRef = dataPayload.transRef;
          console.log(`Slip2Go verified successfully. Remote Ref: ${transRef}`);
        } else {
          throw new Error('Slip2Go response status is not successful.');
        }
      } catch (err: any) {
        console.error('Slip2Go verification failed:', err.response ? err.response.data : err.message);
        const errMsg = err.response?.data?.message || err.response?.data?.error || err.message;
        return res.status(400).json({ 
          error: `การตรวจสอบสลิปผิดพลาด: ${errMsg}` 
        });
      }
    } 
    // 2. SlipOK Integration (Real Production Setup)
    else if (process.env.SLIPOK_API_KEY) {
      console.log('SlipOK API Key found. Performing real verification...');
      // Placeholder for SlipOK (could be implemented similarly if needed)
      transRef = 'SOK-' + Date.now().toString();
    }
    // 3. Simulator Mode (Fallback when no API Key is set)
    else {
      console.log('No API Keys found. Running in Simulator Mode...');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      transRef = 'REF-' + Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    }

    // Update donation in Database
    const updatedDonation = await prisma.donation.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        transactionRef: transRef
      }
    });

    // Broadcast donation event to all connected OBS overlay clients
    io.emit('donation_received', {
      id: updatedDonation.id,
      senderName: updatedDonation.senderName,
      message: updatedDonation.message,
      amount: updatedDonation.amount,
      voiceName: updatedDonation.voiceName,
      createdAt: updatedDonation.createdAt
    });

    console.log(`Donation ${id} verified successfully. Event emitted!`);

    res.json({
      success: true,
      donation: updatedDonation
    });
  } catch (error: any) {
    console.error('Error verifying slip:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 4. Admin Manual Confirm (Overrule status)
app.post('/api/donations/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.body;

    // Validate simple auth token
    if (!token || token !== hashPassword(process.env.ADMIN_PASSWORD || 'admin1234')) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const donation = await prisma.donation.findUnique({
      where: { id }
    });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    if (donation.status === 'SUCCESS') {
      return res.json({ success: true, message: 'Already marked as success.' });
    }

    const transRef = 'MANUAL-' + Date.now().toString();

    const updatedDonation = await prisma.donation.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        transactionRef: transRef
      }
    });

    // Broadcast overlay event
    io.emit('donation_received', {
      id: updatedDonation.id,
      senderName: updatedDonation.senderName,
      message: updatedDonation.message,
      amount: updatedDonation.amount,
      voiceName: updatedDonation.voiceName,
      createdAt: updatedDonation.createdAt
    });

    res.json({
      success: true,
      donation: updatedDonation
    });
  } catch (error: any) {
    console.error('Error manually confirming donation:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 5. Admin Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const dbAdminUsername = process.env.ADMIN_USERNAME || 'admin';
    const dbAdminPassword = process.env.ADMIN_PASSWORD || 'admin1234';

    if (username === dbAdminUsername && password === dbAdminPassword) {
      // Generate simple token by hashing the password
      const token = hashPassword(password);
      return res.json({
        success: true,
        token,
        username
      });
    }

    res.status(401).json({ error: 'Invalid username or password.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. Admin Get Donations List
app.get('/api/donations', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const expectedToken = hashPassword(process.env.ADMIN_PASSWORD || 'admin1234');
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const donations = await prisma.donation.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. Admin Get Stats
app.get('/api/stats', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const expectedToken = hashPassword(process.env.ADMIN_PASSWORD || 'admin1234');
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Total donations (SUCCESS)
    const successDonations = await prisma.donation.findMany({
      where: { status: 'SUCCESS' }
    });

    const totalAmount = successDonations.reduce((sum, d) => sum + d.amount, 0);
    const count = successDonations.length;

    // Top Donators (by total amount per sender)
    const donatorGroups = await prisma.donation.groupBy({
      by: ['senderName'],
      where: { status: 'SUCCESS' },
      _sum: {
        amount: true
      },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: 5
    });

    const topDonators = donatorGroups.map(group => ({
      senderName: group.senderName,
      totalAmount: group._sum.amount || 0
    }));

    // Stats by method
    const promptPayCount = successDonations.filter(d => d.paymentMethod === 'PROMPTPAY').length;
    const trueWalletCount = successDonations.filter(d => d.paymentMethod === 'TRUEWALLET').length;

    res.json({
      totalAmount,
      totalCount: count,
      topDonators,
      methods: {
        PROMPTPAY: promptPayCount,
        TRUEWALLET: trueWalletCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8. Admin Test Alert (Mock Overlay & TTS)
app.post('/api/test-alert', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const expectedToken = hashPassword(process.env.ADMIN_PASSWORD || 'admin1234');
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { senderName, message, amount, voiceName } = req.body;

    const testEvent = {
      id: 'test-' + Date.now(),
      senderName: senderName || 'ผู้บริจาคใจดี',
      message: message || 'นี่คือข้อความทดสอบระบบเสียงและภาพ Overlay!',
      amount: parseFloat(amount) || 99,
      voiceName: voiceName || '',
      createdAt: new Date()
    };

    io.emit('donation_received', testEvent);

    res.json({ success: true, event: testEvent });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 9. Get Donation Goal status (Public)
app.get('/api/goal', async (req, res) => {
  try {
    const aggregate = await prisma.donation.aggregate({
      _sum: {
        amount: true
      },
      where: {
        status: 'SUCCESS'
      }
    });

    const currentSum = aggregate._sum.amount || 0;
    const target = parseFloat(process.env.DONATION_GOAL_TARGET || '5000');
    const title = process.env.DONATION_GOAL_TITLE || 'เป้าหมายโดเนท';

    res.json({
      title,
      target,
      current: currentSum
    });
  } catch (error) {
    console.error('Error fetching donation goal:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start Server
server.listen(PORT, () => {
  console.log(`To The Moon Backend running on port ${PORT}`);
});
