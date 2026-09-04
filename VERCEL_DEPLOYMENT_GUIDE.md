# คู่มือการ Deploy Web Application "ที่นี่มีอะไร?" ลง Vercel 🚀

เอกสารนี้จะช่วยแนะนำขั้นตอนการนำเว็บแอปพลิเคชัน Django โปรเจกต์นี้ขึ้นไปออนไลน์บน **Vercel**

---

## 📋 สิ่งที่ต้องเตรียมก่อนเริ่มต้น (Prerequisites)

1. **GitHub Repository**: ดัน (Push) โค้ดของโปรเจกต์นี้ขึ้น Git Repository (เช่น GitHub, GitLab, หรือ Bitbucket)
2. **Vercel Account**: มีบัญชีผู้ใช้ [Vercel.com](https://vercel.com)
3. **PostgreSQL Database (คำแนะนำพิเศษ)**:
   > ⚠️ **ข้อสำคัญ:** เนื่องจาก Vercel เป็นระบบ Serverless (Read-only System) ไฟล์ฐานข้อมูล SQLite (`db.sqlite3`) ในเครื่องจะไม่สามารถเขียน/บันทึกข้อมูลอย่างถาวรได้
   > 
   > **แนะนำให้ใช้ฐานข้อมูลฟรี เช่น [Neon Tech](https://neon.tech)** (PostgreSQL ฟรี):
   > 1. สมัครใช้งาน Neon.tech แล้วสร้าง Project / Database
   > 2. คัดลอก Connection String (URL) เช่น `postgres://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require` ไว้ใช้เป็น `DATABASE_URL`
4. **Cloudinary (สำหรับเก็บรูปภาพ)**:
   > เนื่องจาก Vercel ไม่เก็บไฟล์มีเดียที่ผู้ใช้อัปโหลด ให้สมัคร [Cloudinary.com](https://cloudinary.com) แล้วนำ `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` มาใช้งาน

---

## 🛠️ ขั้นตอนการ Deploy บน Vercel Dashboard

### ขั้นตอนที่ 1: Import Project เข้า Vercel
1. เข้าไปที่ [Vercel Dashboard](https://vercel.com/dashboard)
2. คลิกปุ่ม **"Add New..."** -> **"Project"**
3. เลือก Repository ของคุณจาก GitHub แล้วคลิก **"Import"**

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables (สิ่งจำเป็นมาก!)
ในหน้าจอก่อนกด Deploy ให้ขยายหัวข้อ **"Environment Variables"** แล้วเพิ่มค่าต่อไปนี้:

| Key | Value (ตัวอย่าง) | คำอธิบาย |
| --- | --- | --- |
| `SECRET_KEY` | `django-insecure-your-production-secret-key-...` | คีย์สุ่มสำหรับความปลอดภัย Django |
| `DEBUG` | `False` | ในสภาพแวดล้อมจริงให้ตั้งเป็น `False` |
| `DATABASE_URL` | `postgres://user:password@ep-xyz.aws.neon.tech/dbname?sslmode=require` | URL เชื่อมต่อ Neon / PostgreSQL |
| `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | Cloud Name จาก Cloudinary |
| `CLOUDINARY_API_KEY` | `your_api_key` | API Key จาก Cloudinary |
| `CLOUDINARY_API_SECRET` | `your_api_secret` | API Secret จาก Cloudinary |
| `GOOGLE_CLIENT_ID` | `...` | (ถ้ามี) Client ID สำหรับ Google Login |
| `GOOGLE_CLIENT_SECRET` | `...` | (ถ้ามี) Client Secret สำหรับ Google Login |
| `LINE_CHANNEL_ID` | `...` | (<ctrl42>ถ้ามี) Channel ID สำหรับ LINE Login |
| `LINE_CHANNEL_SECRET` | `...` | (ถ้ามี) Channel Secret สำหรับ LINE Login |

### ขั้นตอนที่ 3: กด Deploy
1. คลิกปุ่ม **"Deploy"**
2. รอระบบ Build ประมาณ 1-2 นาที เมื่อเสร็จเรียบร้อย Vercel จะแสดงหน้ายินดีต้อนรับพร้อม URL ประจำเว็บ เช่น `https://your-app-name.vercel.app`

---

## 🗄️ การทำ Database Migration บน Production

เมื่อ Deploy ครั้งแรกบน PostgreSQL (เช่น Neon) ตารางในฐานข้อมูลจะยังไม่ถูกสร้างขึ้น ให้เปิดเครื่องโลคอลของคุณแล้วรันคำสั่งรัน Migration ไปยัง Database บน Cloud:

```bash
# บน PowerShell (Windows)
$env:DATABASE_URL="postgres://user:password@ep-xyz.aws.neon.tech/dbname?sslmode=require"
python manage.py migrate
python manage.py createsuperuser
```

*หรือถ้าใช้ Bash/Linux:*
```bash
DATABASE_URL="postgres://user:password@ep-xyz.aws.neon.tech/dbname?sslmode=require" python manage.py migrate
DATABASE_URL="postgres://user:password@ep-xyz.aws.neon.tech/dbname?sslmode=require" python manage.py createsuperuser
```

---

## 📁 ไฟล์ที่ถูกเพิ่ม/ปรับแต่งเพื่อ Vercel ในโปรเจกต์นี้

- [`vercel.json`](file:///d:/Product_Programming/Location_Check-in_App/vercel.json) : กำหนดการ Route คำสั่งไปยัง WSGI Serverless Function และ Static Builder
- [`build_files.sh`](file:///d:/Product_Programming/Location_Check-in_App/build_files.sh) : สคริปต์ รัน `pip install` และ `collectstatic` ในช่วง Build Phase
- [`requirements.txt`](file:///d:/Product_Programming/Location_Check-in_App/requirements.txt) : เพิ่มแพ็กเกจ `whitenoise`
- [`config/settings.py`](file:///d:/Product_Programming/Location_Check-in_App/config/settings.py) : ติดตั้ง `WhiteNoiseMiddleware`, `CSRF_TRUSTED_ORIGINS` และ `STATICFILES_STORAGE`
- [`config/wsgi.py`](file:///d:/Product_Programming/Location_Check-in_App/config/wsgi.py) : กำหนด `app = application` ให้ Vercel ทำงานได้โดยอัตโนมัติ

---

🎉 **เพียงเท่านี้เว็บของคุณก็พร้อมใช้งานบน Vercel ได้อย่างสมบูรณ์แบบ!**
