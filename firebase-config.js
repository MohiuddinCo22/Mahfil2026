// ============================================================
// এখানে আপনার Firebase প্রজেক্টের config বসান।
// Firebase Console > Project Settings > General > Your apps > Web app
// থেকে এই মানগুলো কপি করে আনবেন। বিস্তারিত README.md ফাইলে আছে।
// ============================================================
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
