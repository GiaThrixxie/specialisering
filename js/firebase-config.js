"use strict";

// ========== GLOBAL FIREBASE CONFIG ========== //
// Your web app's Firebase configuration
const _firebaseConfig = {
  apiKey: "AIzaSyDhjtjgQXKnDISUwoYW5v4SWtMmGLHsvag",
  authDomain: "dnd-database-f3610.firebaseapp.com",
  projectId: "dnd-database-f3610",
  storageBucket: "dnd-database-f3610.appspot.com",
  messagingSenderId: "440751452941",
  appId: "1:440751452941:web:16c6db290365d7525ff644"
};
// Initialize Firebase and database references
firebase.initializeApp(_firebaseConfig);
let _firebaseUI;
const _db = firebase.firestore();