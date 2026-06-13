# 📊 macOS Database Connection & Commands Guide (Mac M1 Optimized)

เอกสารฉบับนี้เป็นคู่มือสรุปข้อมูลการเชื่อมต่อและคำสั่งพื้นฐานในการควบคุมจัดการฐานข้อมูลหลังการติดตั้งด้วยสคริปต์ `setup_databases.sh` เรียบร้อยแล้วครับ

---

## 🐘 1. PostgreSQL (v16)

*   **Default Port:** `5432`
*   **Default Host:** `localhost` หรือ `127.0.0.1`
*   **Default User:** ชื่อผู้ใช้งานของเครื่อง Mac ปัจจุบัน (เช่น `xpo`)
*   **การเข้าใช้งานผ่าน Terminal:**
    ```bash
    # เชื่อมต่อเข้าฐานข้อมูลระบบชื่อ 'postgres' ด้วยสิทธิ์ User ปัจจุบัน
    psql postgres
    ```
*   **คำสั่งภายใน psql console เบื้องต้น:**
    *   `\l` : แสดงรายชื่อฐานข้อมูลทั้งหมด
    *   `\c [database_name]` : สลับไปยังฐานข้อมูลที่ต้องการ
    *   `\dt` : แสดงตารางทั้งหมดในฐานข้อมูลปัจจุบัน
    *   `\q` : ออกจากคอนโซล PostgreSQL

---

## 🐬 2. MySQL (Latest Stable)

*   **Default Port:** `3306`
*   **Default Host:** `localhost` หรือ `127.0.0.1`
*   **Default User:** `root`
*   **ขั้นตอนหลังติดตั้งเสร็จ (สำคัญมาก ⚠️):**
    ```bash
    # รันคำสั่งนี้เพื่อตั้งรหัสผ่าน Root และลบสิทธิ์ผู้ใช้จำลอง
    mysql_secure_installation
    ```
*   **การเข้าใช้งานผ่าน Terminal:**
    ```bash
    # เชื่อมต่อและกรอกรหัสผ่านเพื่อเข้าใช้งานคอนโซล
    mysql -u root -p
    ```
*   **คำสั่งภายใน MySQL console เบื้องต้น:**
    *   `SHOW DATABASES;` : แสดงรายชื่อฐานข้อมูลทั้งหมด
    *   `USE [database_name];` : เลือกฐานข้อมูลที่ต้องการใช้
    *   `SHOW TABLES;` : แสดงตารางทั้งหมด
    *   `EXIT;` : ออกจากคอนโซล MySQL

---

## 🟥 3. Redis

*   **Default Port:** `6379`
*   **Default Host:** `localhost` หรือ `127.0.0.1`
*   **การเข้าใช้งานผ่าน Terminal:**
    ```bash
    # เปิดหน้าจอดรอปดาวน์จัดการคำสั่งของ Redis
    redis-cli
    ```
*   **การทดสอบเชื่อมต่อ (Test Connection):**
    ```bash
    # ส่งข้อความตรวจสอบสถานะการตอบรับ (ควรคืนค่าเป็น PONG)
    redis-cli ping
    ```

---

## ⚙️ 4. คำสั่งควบคุม Brew Services (Service Management)

หากต้องการหยุด สตาร์ท หรือเช็คสถานะการทำงานของบริการฐานข้อมูล ให้รันคำสั่งเหล่านี้ใน Terminal ของคุณ:

```bash
# 1. เช็คดูรายการบริการทั้งหมดที่รันอยู่ผ่าน Homebrew
brew services list

# 2. คำสั่งควบคุม PostgreSQL 16
brew services start postgresql@16   # สตาร์ท
brew services stop postgresql@16    # สต็อป
brew services restart postgresql@16 # รีสตาร์ท

# 3. คำสั่งควบคุม MySQL
brew services start mysql
brew services stop mysql
brew services restart mysql

# 4. คำสั่งควบคุม Redis
brew services start redis
brew services stop redis
brew services restart redis
```
