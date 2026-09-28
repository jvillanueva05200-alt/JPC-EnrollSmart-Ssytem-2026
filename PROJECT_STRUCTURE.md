# JPC ENROLLSMART Project Structure

```text
JPC_ENROLLSMART/
├── ENROLLSMART SYSTEM 2026/      # React + Vite frontend
│   ├── src/                       # React source
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── pages/
│   ├── public/                    # Static/PWA assets served by Vite
│   │   ├── manifest.webmanifest   # Canonical PWA manifest
│   │   ├── sw.js                  # Root service worker
│   │   └── assets/
│   │       ├── icons/
│   │       ├── images/
│   │       ├── css/
│   │       └── js/
│   ├── index.html
│   ├── login.html                 # Student login only
│   ├── admin-login.html           # Separate admin login
│   ├── student.html
│   ├── admin.html
│   ├── package.json
│   └── vite.config.js
├── backend/                       # Express.js API
│   ├── server.js
│   ├── data/
│   ├── scripts/
│   └── package.json
├── firestore.rules                # Firebase Firestore rules
├── firebase.json                  # Firebase project config
├── package.json                   # Root workspace scripts
├── .gitignore
├── README.md
└── PROJECT_STRUCTURE.md
```

## PWA

The canonical manifest is `ENROLLSMART SYSTEM 2026/public/manifest.webmanifest`.
Vite copies it to `/manifest.webmanifest` during build.

The canonical service worker is `ENROLLSMART SYSTEM 2026/public/sw.js`, served at `/sw.js` so it can control the entire site, including `/login.html`, `/student.html`, and `/admin.html`.

## Run from repository root

```bash
npm install
npm run build
npm start
```

For development:

```bash
npm run dev
```
