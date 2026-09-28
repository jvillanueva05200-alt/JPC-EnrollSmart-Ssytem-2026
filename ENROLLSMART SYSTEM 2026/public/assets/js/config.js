(function () {
  const localHosts = ["localhost", "127.0.0.1", "::1", ""];
  const backendOverride = window.ENROLLSMART_BACKEND_URL || "";
  const backendUrl = backendOverride || (localHosts.includes(location.hostname) ? "http://localhost:4000" : location.origin);

  window.ENROLLSMART_CONFIG = {
    BACKEND_URL: backendUrl,
    REQUEST_TIMEOUT_MS: 15000,
    FIREBASE: {
      apiKey: "AIzaSyCLmqh2XNdqzJeAB0-MnagcTwVmB0VZLY",
      authDomain: "enrollsmart-130e2.firebaseapp.com",
      projectId: "enrollsmart-130e2",
      storageBucket: "enrollsmart-130e2.firebasestorage.app",
      messagingSenderId: "889151016280",
      appId: "1:889151016280:web:789d6ca802657d560a692d"
    }
  };
})();
