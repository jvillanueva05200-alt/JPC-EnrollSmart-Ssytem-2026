# Package Notes

The project does not require `.env` or `.env.example` files.

Frontend Firebase web configuration is stored in `ENROLLSMART SYSTEM 2026/public/assets/js/config.js`.

The backend generates local runtime credentials on first start and stores them in ignored files under `backend/data/`. Production deployments should replace generated values with platform-managed environment secrets.

The PWA manifest and service worker are stored under `ENROLLSMART SYSTEM 2026/public/` and are copied into the Vite build automatically.
