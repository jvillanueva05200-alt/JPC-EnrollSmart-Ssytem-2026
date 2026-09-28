# JPC ENROLLSMART

JPC ENROLLSMART is a responsive enrollment appointment and monitoring system built with React.js, Firebase, Express.js, Node.js and PWA support.

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

The backend creates a local runtime secret and a unique first-run administrator account automatically. The credentials are printed in the server console and saved to `backend/data/first-run-admin.txt`.

## Firebase
The browser Firebase configuration is stored in `public/assets/js/config.js`. These are public Firebase web-app identifiers intended for browser use.

Enable Email/Password and Google sign-in in Firebase Authentication and enable Firestore. The client integration supports registration, sign-in, persistent sessions, Google sign-in, and Firestore profile retrieval.

When Firebase Admin credentials are available to the backend through the hosting platform, the Express API verifies Firebase ID tokens before issuing its protected application session. If Firebase Admin is not available locally, the login page automatically uses the built-in local authentication flow instead of showing a non-working Firebase button.

## PWA
The project includes `manifest.webmanifest`, service-worker support, 192px and 512px application icons, theme metadata, Apple touch icon metadata, and install shortcuts for student and administrator login.

## Production secrets
No `.env` file is required. For production, provide secrets through the deployment platform's environment/secret manager: `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `FRONTEND_ORIGIN`, and Firebase Admin credentials. Do not commit those values to source control.
