import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const cfg = window.ENROLLSMART_CONFIG?.FIREBASE || {};
const configured = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
let auth = null;
let db = null;
let persistenceReady = Promise.resolve();

if (configured) {
  const app = getApps().length ? getApps()[0] : initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
  persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => {});
}

const studentEmail = (id) => `${String(id).trim()}@student.enrollsmart.local`;

async function saveUserProfile(user, profile = {}) {
  if (!db || !user) return;
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: profile.name || user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    studentId: profile.studentId || "",
    provider: profile.provider || "firebase",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function getUserDetails() {
  if (!auth?.currentUser) return null;
  const user = auth.currentUser;
  let profile = {};
  if (db) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) profile = snap.data();
  }
  return {
    uid: user.uid,
    name: profile.name || user.displayName || "",
    email: profile.email || user.email || "",
    photoURL: profile.photoURL || user.photoURL || "",
    studentId: profile.studentId || "",
    provider: profile.provider || "firebase"
  };
}

async function exchangeToken(profile = {}) {
  if (!auth?.currentUser) throw new Error("Firebase session is not available.");
  const idToken = await auth.currentUser.getIdToken(true);
  const response = await fetch(`${window.ENROLLSMART_CONFIG.BACKEND_URL}/api/auth/firebase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, ...profile })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Firebase authentication failed.");
  return data;
}

async function signInStudent(studentId, password) {
  if (!auth) return null;
  await persistenceReady;
  await signInWithEmailAndPassword(auth, studentEmail(studentId), password);
  const details = await getUserDetails();
  return exchangeToken({ studentId, name: details?.name || "", provider: "firebase" });
}

async function registerStudent(studentId, name, password) {
  if (!auth) return null;
  await persistenceReady;
  const credential = await createUserWithEmailAndPassword(auth, studentEmail(studentId), password);
  await saveUserProfile(credential.user, { studentId, name, provider: "firebase" });
  return exchangeToken({ studentId, name, provider: "firebase" });
}

async function signInGoogle() {
  if (!auth) return null;
  await persistenceReady;
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const details = await getUserDetails();
  const result = await exchangeToken({ name: details?.name || credential.user.displayName || "", provider: "google", email: credential.user.email || "" });
  await saveUserProfile(credential.user, { name: result.name, studentId: result.id, provider: "google" });
  return result;
}

async function firebaseLogout() {
  if (auth) await signOut(auth);
}

window.JPCFirebase = {
  configured,
  auth,
  db,
  signInStudent,
  registerStudent,
  signInGoogle,
  firebaseLogout,
  getUserDetails,
  saveUserProfile
};
