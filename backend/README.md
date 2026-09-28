# JPC ENROLLSMART Express Backend

The backend provides the Express REST API, JWT sessions, role-based access control, enrollment rules, administrator management, and optional Firebase Admin token verification.

## Setup
Run `npm install` and then `npm start`. No `.env` file is required. On the first run, the server creates a local runtime secret and a unique administrator password. The credentials are printed once and saved to `data/first-run-admin.txt`.

For production, the hosting platform can provide `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `FRONTEND_ORIGIN`, `FIREBASE_SERVICE_ACCOUNT_JSON`, or Google Application Default Credentials as environment/secrets.

## Firebase authentication flow
The browser authenticates students with Firebase Authentication and stores profile data in Firestore. When Firebase Admin is available on the server, the browser sends its Firebase ID token to `/api/auth/firebase`, where the token is verified before the application session is issued. If Firebase Admin is unavailable, the login page automatically uses the built-in local account flow instead of showing a broken Firebase login.

## Runtime files
`data/db.json` contains application data. `data/runtime-config.json` contains generated runtime secrets. `data/first-run-admin.txt` contains the first-run administrator credentials. These files are ignored by Git and should not be committed.
