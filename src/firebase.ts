import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// Firebase Consoleからコピーした設定情報を貼り付けます
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBz-A6mU2hUNyH4eQCLas9apRay9ImEeas",
    authDomain: "hiking-plan-app.firebaseapp.com",
    projectId: "hiking-plan-app",
    storageBucket: "hiking-plan-app.firebasestorage.app",
    messagingSenderId: "658703784889",
    appId: "1:658703784889:web:7e54a3795e8c607271f468",
    measurementId: "G-YZRLWFTHGV"
  };
  
// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// Firestoreデータベースインスタンスのエクスポート
export const db = getFirestore(app);

import { getStorage } from 'firebase/storage';
// すでに初期化されている app を使用
export const storage = getStorage(app);