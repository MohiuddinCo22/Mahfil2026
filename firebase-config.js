// ============================================================
// এখানে আপনার Firebase প্রজেক্টের config বসান।
// Firebase Console > Project Settings > General > Your apps > Web app
// থেকে এই মানগুলো কপি করে আনবেন। বিস্তারিত README.md ফাইলে আছে।
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBd8SELqb-VW8qhv5ikzcJ6EBWo8JTBC-w",
  authDomain: "milad-mahfil-hishab.firebaseapp.com",
  projectId: "milad-mahfil-hishab",
  storageBucket: "milad-mahfil-hishab.firebasestorage.app",
  messagingSenderId: "551678532386",
  appId: "1:551678532386:web:52d82c9ad1ae65f816237b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
