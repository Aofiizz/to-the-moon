# 🚀 Architecture & Tech Stack Design Guide: Self-Hosted Donation System

เอกสารฉบับนี้จัดทำขึ้นเพื่อเป็นแนวทางการออกแบบและพัฒนาเว็บแอปพลิเคชันระบบโดเนท/ทิปเพื่อใช้งานส่วนตัว (Private Use) โดยถอดบทเรียนสถาปัตยกรรมมาจากแพลตฟอร์มยอดนิยมอย่าง **Easy Donate** และ **Tipme** เพื่อให้ระบบมีความเสถียร ปลอดภัย ประหยัดค่าธรรมเนียม และสามารถประมวลผลข้อมูลได้แบบ Real-time

---

## 1. Hardware & Infrastructure Requirement

เนื่องจากเป็นระบบที่พัฒนาขึ้นเพื่อใช้งานเอง (สเกลผู้ใช้ไม่เกิน 500-1,000 รายการต่อวัน) ทรัพยากรที่ต้องใช้จึงไม่สูงมาก แต่เน้นเรื่อง **Availability (เปิดได้ 24 ชั่วโมง)** และ **Network Latency ที่ต่ำ** เพื่อการรับส่งข้อมูล Webhook และ Real-time Overlay ที่ฉับไว

### ทางเลือกที่ 1: เช่า Cloud VPS (แนะนำที่สุด ⭐)
การเลือกใช้ Virtual Private Server ในไทย ช่วยให้ Latency ต่ำ และมั่นใจได้ว่าระบบจะไม่ล่มเมื่อไฟดับหรือเน็ตบ้านมีปัญหา
* **vCPU:** 1 - 2 Cores (เช่น AMD EPYC หรือ Intel Xeon)
* **Memory (RAM):** 2 GB DDR4/DDR5 (เพียงพอสำหรับรัน Node.js Runtime, Database และ Redis)
* **Storage:** 20 - 40 GB NVMe SSD (เน้นความเร็วในการเขียนอ่านตาราง Log และ Transaction)
* **OS:** Ubuntu Server 22.04 LTS / 24.04 LTS
* **Bandwidth:** Unmetered 100Mbps/1Gbps (ในประเทศ)

### ทางเลือกที่ 2: Self-Hosted (Mini PC / คอมพิวเตอร์ส่วนตัว)
หากต้องการตั้งเซิร์ฟเวอร์ไว้ที่บ้านเพื่อควบคุม Hardware เอง 100%
* **Hardware:** PC ทั่วไป, Mini PC (เช่น Intel N100) หรือ Raspberry Pi 4 / 5 (รุ่น RAM 4GB หรือ 8GB)
* **Network Setup:** ต้องติดตั้ง **Cloudflare Tunnel** หรือ **Tailscale Funnel** เพื่อทำ Secure Reverse Proxy ชี้เข้ามารับ Webhook ที่บ้านโดยไม่จำเป็นต้องทำ Port Forwarding และซ่อน IP บ้านเพื่อความปลอดภัย

---

## 2. Full Tech Stack Architecture



ระบบนี้ต้องการความยืดหยุ่นในการเขียนโค้ด การประมวลผลแบบ Event-driven และการเชื่อมต่อแบบ Real-time จึงเลือกใช้ Tech Stack ที่เป็นพิมพ์นิยมและมี Library ซัพพอร์ตหนาแน่นดังนี้:

### 🧩 Frontend & Client
* **Framework:** **Next.js (React)** หรือ **Nuxt (Vue 3)**
  * *เหตุผล:* ใช้ระบบ SSR (Server-Side Rendering) ในการทำหน้าแรก และใช้รูปแบบ SPA ในหน้า Dashboard / Overlay ช่วยให้การเขียนเว็บหน้าบ้านและหลังบ้านรวมอยู่บน Repository เดียวกันได้ (Monorepo)
* **Styling:** **Tailwind CSS + shadcn/ui** (หรือ PrimeVue) เพื่อการขึ้นโครง Form กรอกเงิน, กล่อง Widget และหน้า Dashboard ที่สวยงามรวดเร็ว
* **Real-time Integration:** `socket.io-client` สำหรับฝั่งหน้าจอ OBS Studio เพื่อรอรับ Event แอนิเมชันเวลามีคนโดเนท

### ⚙️ Backend & API Service
* **Runtime:** **Node.js (TypeScript)** ร่วมกับ **Express** หรือ **NestJS** (หรือ Python ด้วย **FastAPI**)
  * *เหตุผล:* Node.js มีความสามารถโดดเด่นในด้าน I/O Asynchronous และการจัดการ Webhook Queue พร้อมกันจำนวนมาก
* **Real-time Server:** **Socket.io** (Websocket Protocol) ทำหน้าที่เป็น Gateway บรอดแคสต์เหตุการณ์โอนเงินสำเร็จไปยังสตรีมเมอร์
* **Task Queue:** **BullMQ (รันบน Redis)** เพื่อทำคิวในการประมวลผล เช่น คิวอ่านออกเสียง Text-to-Speech (TTS) หรือคิวการส่งคำสั่ง RCON ไปยังเซิร์ฟเวอร์เกม เพื่อไม่ให้ระบบค้างหากมีคนโอนเข้ามาพร้อมกัน

### 🗄️ Database & Cache Layer
* **Primary Database:** **PostgreSQL** หรือ **MySQL 8.0**
  * *ORMs:* **Prisma** หรือ **Drizzle ORM** (ช่วยจัดการ Schema Migrations และมี Type-safe ที่แข็งแกร่ง)
* **Caching & Session:** **Redis** ใช้สำหรับเก็บสถิติล่าสุด (เช่น Top Donate ประจำวัน), เก็บ Session ของ Admin และเป็นตัวขับเคลื่อนระบบ Queue

---

## 3. Database Schema Design (Minimalist)

โครงสร้างฐานข้อมูลเบื้องต้นที่จำเป็นต้องมีในการบันทึก Transaction และตรวจสอบความถูกต้อง:

```sql
-- ตารางผู้ใช้งาน/แอดมิน
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตารางประวัติรายการโดเนท
CREATE TABLE donations (
    id VARCHAR(36) PRIMARY KEY,
    sender_name VARCHAR(50) NOT NULL,
    message TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- 'PROMPTPAY', 'TRUEWALLET'
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED'
    transaction_ref VARCHAR(100) UNIQUE,  -- ไอดีอ้างอิงจากธนาคาร/สลิป (TransRef)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);