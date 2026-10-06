import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdkwMdANKz93nD8vKuI7vYEDyJbH9xZmg",
  authDomain: "caixavillani.firebaseapp.com",
  projectId: "caixavillani",
  storageBucket: "caixavillani.firebasestorage.app",
  messagingSenderId: "584167558551",
  appId: "1:584167558551:web:e721fd85e3ff9266f6c8d2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy
};
