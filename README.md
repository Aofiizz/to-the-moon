# 🚀 To The Moon: Private Self-Hosted Donation System

ระบบโดเนทและแจงเตือนสตรีมเมอร์ส่วนตัว (Private Self-Hosted Donation System) ที่รองรับการชำระเงินผ่าน PromptPay QR, มีระบบตรวจสอบสลิปอัตโนมัติ (Slip Verification), หน้าแดชบอร์ดจัดการของแอดมิน, เกจสะสมโดเนท (Goal Bar) และระบบแจ้งเตือนขึ้นจอไลฟ์สตรีมแบบเรียลไทม์ (OBS Overlay) พร้อมเสียงเอฟเฟกต์น้าค่อมชวนชื่นและเสียงอ่านออกเสียงข้อความ (Text-To-Speech) ภาษาไทย **โดยไม่มีค่าธรรมเนียมหักเปอร์เซ็นต์ (0% Fee)**

---

## 🌟 จุดเด่นและฟีเจอร์หลัก (Key Features)

*   **0% Fees:** โอนเงินผ่าน PromptPay QR ยอดเงินตรงเข้าบัญชีธนาคารส่วนตัวของคุณทันที 100% ไม่โดนหัก GP เหมือนระบบอื่น
*   **PromptPay QR Generator:** เจน QR Code ยอดเงินตรงตามที่โดเนททันทีอัตโนมัติ
*   **Automatic Slip Verification:** ระบบตรวจสอบภาพถ่ายสลิปโอนเงิน (มีระบบจำลอง Simulator Mode สำหรับเทส และระบบเชื่อมต่อ SlipOK API เพื่อเช็คยอดโอนกับธนาคารจริงป้องกันสลิปปลอม/สลิปซ้ำ)
*   **OBS Alert Overlay:** ฉากแจ้งเตือนบน OBS Studio พื้นหลังโปร่งใส เล่นเอฟเฟกต์ยานอวกาศพุ่งแบบเรียลไทม์
*   **Meme Sound Alerts:** เล่นเสียงมีมน้าค่อม ชวนชื่น ตามระดับยอดเงินโอน (ไม่ได้แดกกูหรอก / อุบ๊ะ! / เสียงหัวเราะ / ไอ้สัส!)
*   **Text-to-Speech (TTS):** สังเคราะห์เสียงอ่านข้อความโดเนทภาษาไทยอัตโนมัติ (ข้ามไม่ยอมอ่านสัญลักษณ์ `฿` เพื่อป้องกันเสียงอ่านสะดุด) และรองรับการเลือกเสียง Siri ชาย/หญิง หรือเสียง Google
*   **Donation Goal Bar:** แถบเกจเป้าหมายโดเนทสะสมเรืองแสง เลื่อนเพิ่มขึ้นแบบสดๆ ทันทีเมื่อโอนสำเร็จ (Real-time update)
*   **Live Alert Preview:** แสดงตัวอย่างหน้าต่างเด้งแจ้งเตือนแบบเรียลไทม์ให้คนโดเนทเห็นหน้าฟอร์มก่อนตัดสินใจโอนเงิน!
*   **Admin Dashboard:** แผงควบคุมสำหรับเข้าดูยอดสถิติรวม ดูประวัติการโดเนททั้งหมด และอนุมัติสลิปด้วยตนเอง (Manual Override)
*   **Testing Tools:** มีฟอร์มจำลองข้อมูลให้สตรีมเมอร์สแตนด์บายทดสอบยิง Alert/เสียงขึ้นจอ OBS หรือเทสเสียงอ่านในตัวได้จากแดชบอร์ด

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
tothemoon/
├── backend/                # ระบบ API และ WebSockets (Express + TypeScript + Prisma)
│   ├── prisma/             # การตั้งค่าฐานข้อมูล SQLite (schema.prisma)
│   ├── src/
│   │   ├── db/             # ตัว Seeder สร้างบัญชีผู้ใช้เริ่มต้น
│   │   ├── utils/          # เครื่องมือคำนวณ PromptPay QR
│   │   └── server.ts       # เซิร์ฟเวอร์หลัก Express & Socket.io
│   └── package.json
├── frontend/               # ระบบหน้าบ้าน (React + Vite)
│   ├── public/sounds/      # แหล่งเก็บไฟล์เสียงมีมน้าค่อมในระบบ ( level1 - level4.mp3 )
│   ├── src/
│   │   ├── pages/          # หน้าเว็บ (DonatePage, DashboardPage, OverlayPage, GoalPage)
│   │   ├── App.jsx         # การควบคุม Routing หน้าหลัก
│   │   └── index.css       # ระบบดีไซน์และ CSS Glassmorphism พรีเมียม
│   └── package.json
├── .gitignore              # ไฟล์ข้ามการเก็บประวัติ Git
├── start.sh                # สคริปต์สแตนด์บายรันเซิร์ฟเวอร์หลังบ้าน/หน้าบ้านพร้อมกัน
└── README.md               # เอกสารแนะนำการติดตั้ง
```

---

## ⚙️ การเตรียมตั้งค่าก่อนใช้งาน

คัดลอกไฟล์ต้นแบบสร้างไฟล์ `.env` ที่โฟลเดอร์ `backend/.env` เพื่อกรอกข้อมูลสำคัญของคุณ:

```ini
PORT=3001
DATABASE_URL="file:./dev.db"

# ข้อมูลสำหรับเข้าใช้หน้าแดชบอร์ดแอดมิน
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin1234

# หมายเลขพร้อมเพย์ของคุณที่รับเงินโอน (เบอร์มือถือ หรือ เลขบัตรประชาชน)
PROMPTPAY_ID=1361000300841

# เกจเป้าหมายโดเนท (Goal Bar Overlay)
DONATION_GOAL_TARGET=5000
DONATION_GOAL_TITLE="สมทบทุนซื้ออุปกรณ์สตรีมใหม่ 🚀"

# (ตัวเลือก) สำหรับเปิดระบบตรวจสอบสลิปโอนเงินกับธนาคารจริง สมัครเอาคีย์ได้จาก https://slipok.com
SLIPOK_API_KEY=""
SLIPOK_BRANCH_ID=""
```

---

## 🛠️ ขั้นตอนการติดตั้งและเปิดรันระบบ (Installation Guide)

เพื่อให้มั่นใจว่าระบบไม่มีข้อผิดพลาด ให้ทำตามคำสั่งใน Terminal ตามลำดับนี้:

### 1. ติดตั้ง Backend
```bash
cd backend
npm install
npx prisma db push
npx ts-node src/db/seed.ts
npm run build
cd ..
```

### 2. ติดตั้ง Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. รันโปรเจกต์
รันโปรเจกต์พร้อมกันทั้งหน้าบ้านและหลังบ้านในโหมดพัฒนาผ่านคำสั่งเดียว:
```bash
chmod +x start.sh
./start.sh
```

เมื่อรันสำเร็จ หน้าเว็บจะพร้อมทำงานที่ URL ดังนี้:
*   **หน้า Donate (ผู้สนับสนุน):** `http://localhost:3000`
*   **แดชบอร์ดจัดการแอดมิน:** `http://localhost:3000/dashboard`
*   **Overlay แจ้งเตือนสตรีม (Alert Box):** `http://localhost:3000/overlay`
    *   *บังคับเสียงพูดผู้ชาย:* `http://localhost:3000/overlay?voice=pattara`
    *   *บังคับเสียงพูดสิริผู้หญิง:* `http://localhost:3000/overlay?voice=narayisa`
*   **Overlay เกจโดเนทสะสม (Goal Bar):** `http://localhost:3000/goal`

---

## 🔒 การขึ้นโฮสต์จริง (Production & VPS Setup)

สำหรับการนำระบบนี้ไปรันเปิดใช้แบบออนไลน์ 24 ชั่วโมงในเซิร์ฟเวอร์ VPS แนะนำให้ทำดังนี้:
1.  ติดตั้งตัวจัดการโพรเซส **PM2** เพื่อรันระบบเบื้องหลัง: `npm install -g pm2`
2.  ตั้งค่า **Nginx** หรือ **Cloudflare Tunnel** เพื่อชี้โดเมนเนมมาที่ระบบ พร้อมทำความปลอดภัยแบบ **HTTPS** 
3.  สามารถเปิดดูรายละเอียดการติดตั้งเซิร์ฟเวอร์แบบเจาะลึกได้ในคู่มือ [server_requirements.md](./server_requirements.md)
