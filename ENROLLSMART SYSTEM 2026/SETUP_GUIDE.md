# JPC ENROLLSMART Setup Guide

## 1. Install
```bash
npm install
```

## 2. Start
```bash
npm start
```

Open `http://localhost:4000`. The backend creates its runtime secret and first administrator account automatically on first start.

## 3. Firebase
In Firebase Console, enable Email/Password and Google authentication, create Firestore, and verify that the web app configuration in `public/assets/js/config.js` matches the Firebase project.

For server-side Firebase ID-token verification, run the backend with Firebase Admin credentials supplied by the deployment platform. A local `GOOGLE_APPLICATION_CREDENTIALS` path or `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable is supported.

## 4. PWA
The application includes the web manifest, service worker, application icons, theme metadata, and login shortcuts. The production server should serve the site over HTTPS for full installability and service-worker behavior.

## 5. Authentication
Student registration and login are available through Firebase when Firebase Admin is configured. Without server-side Firebase credentials, the same forms automatically use the protected local Express authentication flow. Google sign-in is shown only when Firebase server verification is available.
