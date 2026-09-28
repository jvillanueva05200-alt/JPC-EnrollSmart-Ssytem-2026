# JPC ENROLLSMART

JPC ENROLLSMART is a responsive enrollment appointment system built with React.js, Firebase, Express.js, Node.js and PWA support.

## Pages
- `index.html` — landing page
- `login.html` — student login and registration
- `admin-login.html` — administrator login
- `student.html` — student dashboard
- `admin.html` — administrator dashboard

## Quick start
1. Install Node.js 18 or newer.
2. Run `npm install` from the repository root.
3. Run `npm start`.
4. Open `http://localhost:4000/`.

The backend creates a local runtime secret and a unique first-run administrator account automatically. The generated administrator credentials are printed in the server console and saved to `backend/data/first-run-admin.txt`.

The Firebase web configuration is stored in `ENROLLSMART SYSTEM 2026/public/assets/js/config.js`. These values are Firebase web-app identifiers and are safe to ship to the browser. Firebase Admin token verification remains optional for local development; when Firebase Admin credentials are available through the server environment or Google Application Default Credentials, Firebase Authentication and Firestore profile storage are enabled automatically.

## Firebase
Enable Email/Password and Google sign-in in Firebase Authentication and enable Firestore. The client integration supports account registration, sign-in, persistent sessions, Google sign-in, and user profile retrieval. The Express API verifies Firebase ID tokens whenever Firebase Admin is configured.

For production, provide `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `FRONTEND_ORIGIN`, and Firebase Admin credentials through the hosting platform's secret/environment configuration instead of committing them to the project. No `.env` file is required.

## PWA
The project includes `manifest.webmanifest`, service worker support, 192px and 512px icons, theme metadata, Apple touch icon metadata, and install shortcuts for student and administrator login.
