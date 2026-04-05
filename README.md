 VIVEK dav dddsds
# 🏭 Barcode Label MES System
### Full Factory Level Manufacturing Execution System
**Stack: Node.js + Express + EJS + SQL Server + Socket.io**

---

## 📋 System Overview

A complete Industrial MES system for a Barcode Label Factory with:
- **15 Machines** (Auto/Manual)
- **15 Operators** + Admin + Owner roles
- **Live factory floor dashboard** with real-time machine status
- **Job lifecycle management** — create, assign, start, log, complete
- **Production reports** — daily, operator ranking, machine utilization
- **Role-based access control** (Owner / Admin / Operator)
- **Real-time updates** via Socket.io every 5 seconds

---

## 🖥 System Requirements

| Component | Requirement |
|-----------|-------------|
| OS | Windows Server 2016+ / Windows 10+ |
| Node.js | v16.0.0 or higher |
| SQL Server | 2016+ (Express edition works) |
| RAM | 4GB minimum, 8GB recommended |
| Browser | Chrome / Edge (latest) |

---

## 🚀 Installation Guide

### Step 1: Install Prerequisites

**Install Node.js:**
```
https://nodejs.org → Download LTS version → Install
Verify: node --version
```

**Install SQL Server:**
```
https://www.microsoft.com/en-us/sql-server/sql-server-downloads
→ Download Express (free) or use existing SQL Server
→ Enable TCP/IP connections in SQL Server Configuration Manager
→ Enable SQL Server Authentication mode
```

---

### Step 2: Setup Database

1. Open **SQL Server Management Studio (SSMS)**
2. Connect to your SQL Server instance
3. Open file `scripts/database.sql`
4. Click **Execute** (F5)
5. Verify database `BarcodeMES` was created with all tables

---

### Step 3: Configure Environment

```bash
# Copy the example config
copy .env.example .env

# Edit .env with your settings
notepad .env
```

Fill in:
```
DB_SERVER=localhost          # or your SQL Server IP
DB_NAME=BarcodeMES
DB_USER=sa
DB_PASSWORD=your-password
PORT=3000
```

---

### Step 4: Install Node Dependencies

```bash
# Open Command Prompt in project folder
cd path\to\mes-system

npm install
```

---

### Step 5: Start the Server

```bash
# Production start
npm start

# Development (auto-restart on changes)
npm run dev
```

You should see:
```
🏭 Barcode Label MES System
🚀 Server running at http://localhost:3000
✅ SQL Server connected
```

---

### Step 6: Access the System

Open browser and go to: **http://localhost:3000**

**Default Login Credentials:**

| Role | Username | Password |
|------|----------|----------|
| Owner | `owner` | `Admin@123` |
| Admin | `admin` | `Admin@123` |
| Operator 1 | `rahul` | `Operator@123` |
| Operator 2 | `suresh` | `Operator@123` |
| (all operators) | see below | `Operator@123` |

All 15 operator usernames: `rahul`, `suresh`, `amit`, `ravi`, `priya`, `deepak`, `mohan`, `kiran`, `sanjay`, `vikram`, `anita`, `rohit`, `pooja`, `arun`, `neha`

> **Important:** Change all passwords immediately after first login through Admin Panel!

---

## 📱 Mobile Access (Operator Login)

Operators can log in from their mobile phones using the factory's WiFi:
1. Connect phone to factory LAN WiFi
2. Open browser, go to: `http://[SERVER-IP]:3000`
3. Login with their credentials

Find server IP: `ipconfig` in Command Prompt → look for IPv4 Address

---

## 🗂 Folder Structure

```
mes-system/
├── app.js                    # Main server entry point
├── package.json              # Dependencies
├── .env                      # Environment config (create from .env.example)
├── config/
│   └── database.js           # SQL Server connection pool
├── middleware/
│   └── auth.js               # Authentication & authorization
├── routes/
│   ├── auth.js               # Login/logout
│   ├── owner.js              # Owner dashboard, jobs, reports
│   ├── operator.js           # Operator dashboard, job controls
│   ├── admin.js              # Employee/machine management
│   └── api.js                # REST API for real-time data
├── views/
│   ├── login.ejs             # Login page
│   ├── error.ejs / 404.ejs   # Error pages
│   ├── partials/
│   │   ├── header.ejs        # Navbar & flash messages
│   │   └── footer.ejs        # Scripts closing tags
│   ├── owner/
│   │   ├── dashboard.ejs     # Factory floor live grid
│   │   ├── jobs.ejs          # Job management
│   │   ├── reports.ejs       # Reports hub
│   │   ├── report-daily.ejs  # Daily production report
│   │   ├── report-operator.ejs # Operator ranking
│   │   └── report-machine.ejs  # Machine utilization
│   ├── operator/
│   │   └── dashboard.ejs     # Operator job control panel
│   └── admin/
│       ├── dashboard.ejs     # Employee & machine management
│       └── audit.ejs         # Activity audit log
├── public/
│   ├── css/style.css         # Industrial dark theme
│   └── js/main.js            # Client-side scripts
└── scripts/
    └── database.sql          # Complete SQL Server setup script
```

---

## 🔐 Security Setup (Production)

1. **Change all passwords** via Admin Panel
2. **Update SESSION_SECRET** in `.env` to a random 32+ character string
3. **Enable Windows Firewall** — only allow port 3000 on LAN
4. **Backup database** regularly:
```sql
BACKUP DATABASE BarcodeMES TO DISK = 'C:\Backups\BarcodeMES.bak'
```
5. **HTTPS** (optional): Use nginx as reverse proxy with SSL certificate

---

## 🖥 Running as Windows Service (Auto-start)

Install `pm2` to run as background service:
```bash
npm install -g pm2
pm2 start app.js --name "MES-System"
pm2 startup
pm2 save
```

This ensures the server restarts automatically after reboots.

---

## 📊 Database Tables

| Table | Purpose |
|-------|---------|
| `Employees` | All users — Owner, Admin, Operators |
| `Machines` | 15 machines with live status |
| `Jobs` | Job master — customer orders |
| `Job_Production_Log` | Every qty entry by operators |
| `Machine_Log` | Machine on/off activity log |
| `Job_Queue` | Next jobs waiting per machine |
| `Audit_Log` | System activity audit trail |
| `Attendance` | Operator check-in/check-out |

---

## 🔄 Workflow

```
Owner Creates Job → Assigns to Machine + Operator
         ↓
Operator Logs In (Mobile/Desktop)
         ↓
Starts Job → Machine Status = RUNNING
         ↓
Logs Qty Produced (multiple entries)
         ↓
Stops Job (Completed / Paused)
         ↓
Owner sees live updates on Dashboard
```

---

## 🛠 Troubleshooting

**Cannot connect to database:**
- Check SQL Server is running: `services.msc` → SQL Server (MSSQLSERVER)
- Check TCP/IP enabled: SQL Server Configuration Manager → Protocols
- Verify credentials in `.env`
- Try `DB_SERVER=localhost\\SQLEXPRESS` for Express edition

**Port 3000 already in use:**
- Change `PORT=3001` in `.env`

**Socket.io not working (no live updates):**
- Check firewall allows port 3000
- Ensure Socket.io client loaded (check browser console)

---

## 📞 Support

This system was built per specification document:
**"FULL FACTORY LEVEL BARCODE LABEL MES SYSTEM"**

For customization requests:
- Adding new machine types
- Custom report formats
- Integration with ERP/SAP
- Barcode scanning integration
- QR Code job start feature

---

*Version 1.0.0 | Built with Node.js + Express + SQL Server*
