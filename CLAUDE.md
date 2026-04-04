# CLAUDE.md — Barcode Label MES (Manufacturing Execution System)
> EasyShop Marketing Pvt Ltd | Developed by SV ERP Solutions

---

## Project Overview

A Node.js/Express based Manufacturing Execution System for barcode label printing.
Current version: **v4.2**

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Backend     | Node.js + Express                 |
| Frontend    | HTML + CSS + JS (PWA)             |
| Database    | MySQL                             |
| Auth        | Software Licensing (HMAC-SHA256)  |
| Deployment  | Windows (local/on-premise)        |

---

## Licensing System

- Algorithm: **HMAC-SHA256** machine-locked keys
- Key Format: `BMES-YYYYMMDD-MID4-SIGNATURE`
- Vivek's Machine ID: `E711C6528C88`
- Licenses are tied to Machine ID — never generate a key without verifying Machine ID first
- License validation happens on app startup

---

## Key Modules

1. **Software Licensing System** — machine-locked key generation & validation
2. **Customer-facing PWA Portal** — order placement and tracking
3. **Order Request Management** — intake, approval, processing workflow
4. **Artwork File Uploads** — file handling for label artwork
5. **Barcode Label Printing** — core MES functionality

---

## Project Structure (Reference)

```
barcode-mes/
├── server.js              # Main Express entry point
├── routes/                # API route handlers
├── views/                 # HTML/EJS templates
├── public/                # Static assets (PWA files)
├── uploads/               # Artwork file uploads
├── license/               # License validation module
└── package.json
```

---

## Coding Conventions

- Use **async/await** for all DB and file operations
- Always validate license on protected routes (middleware)
- File uploads: validate file type and size before saving
- Use `try/catch` blocks for all async operations
- Keep route files thin — business logic in separate modules
- Console log format: `[BMES] message here`

---

## Database

- **DB:** MySQL (local)
- Key tables (reference):
  - Orders / order requests
  - Customers
  - License records
  - Artwork files metadata

---

## Important Rules

- ⚠️ Never hardcode Machine ID — always read dynamically
- ⚠️ License key must be validated before any protected feature is accessed
- ⚠️ Artwork uploads must be stored with original filename + timestamp to avoid conflicts
- ⚠️ PWA manifest and service worker must be kept updated with each version bump

---

## Developer Info

- **Developer:** Vivek Yada — SV ERP Solutions, Greater Noida West
- **Client:** EasyShop Marketing Pvt Ltd
- **Contact Machine ID:** E711C6528C88

---

## Version History (Brief)

| Version | Notes                                      |
|---------|--------------------------------------------|
| v4.2    | Current — Licensing, PWA portal, Artwork uploads |
| v4.x    | Added customer portal and order management |
| v3.x    | Core barcode label MES functionality       |

---

## Common Commands

```bash
# Start server
node server.js

# Install dependencies
npm install

# Check Node version
node -v
```

---

*This file is read automatically by Claude Code at session start.*
*Keep this file updated as the project evolves.*
