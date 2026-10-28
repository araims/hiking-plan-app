import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import type { Member, MountainPlan } from '../types';

// ==========================================
// 1. Firebase 初期設定
// ==========================================
// ※環境に合わせて設定値を適宜調整してください
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForEnvironment-Placeholder",
  authDomain: "hiking-plan-app.firebaseapp.com",
  projectId: "hiking-plan-app",
  storageBucket: "hiking-plan-app.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

const app = initializeApp(firebaseConfig);

// 外部からインポートできるように export する
export const db = getFirestore(app);
export const storage = getStorage(app);


// ==========================================
// 2. メンバー管理 (Members)
// ==========================================

// メンバー一覧のリアルタイム購読
export function subscribeMembers(callback: (members: Member[]) => void) {
  const q = query(collection(db, 'members'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list: Member[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Member));
    callback(list);
  }, (error) => {
    console.error('メンバーの取得に失敗しました:', error);
  });
}

// メンバー追加
export async function addMemberToDb(member: Omit<Member, 'id'>) {
  try {
    await addDoc(collection(db, 'members'), member);
  } catch (error) {
    console.error('メンバーの追加に失敗しました:', error);
    throw error;
  }
}

// メンバー更新
export async function updateMemberInDb(member: Member) {
  try {
    const docRef = doc(db, 'members', member.id);
    await updateDoc(docRef, {
      name: member.name,
      roleInClub: member.roleInClub,
      email: member.email,
      phone: member.phone
    });
  } catch (error) {
    console.error('メンバーの更新に失敗しました:', error);
    throw error;
  }
}

// メンバー削除
export async function deleteMemberFromDb(id: string) {
  try {
    await deleteDoc(doc(db, 'members', id));
  } catch (error) {
    console.error('メンバーの削除に失敗しました:', error);
    throw error;
  }
}


// ==========================================
// 3. 山行計画書管理 (Plans)
// ==========================================

// 計画書一覧のリアルタイム購読
export function subscribePlans(callback: (plans: MountainPlan[]) => void) {
  const q = query(collection(db, 'plans'), orderBy('startDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: MountainPlan[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MountainPlan));
    callback(list);
  }, (error) => {
    console.error('計画書の取得に失敗しました:', error);
  });
}

// 新規計画書の作成
export async function createPlanInDb(planData: Omit<MountainPlan, 'id'>) {
  try {
    const docRef = await addDoc(collection(db, 'plans'), planData);
    return docRef.id;
  } catch (error) {
    console.error('計画書の作成に失敗しました:', error);
    throw error;
  }
}

// 計画書の更新
export async function updatePlanInDb(planId: string, updateData: Partial<MountainPlan>) {
  try {
    const docRef = doc(db, 'plans', planId);
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('計画書の更新に失敗しました:', error);
    throw error;
  }
}

// 計画書の削除
export async function deletePlanFromDb(planId: string) {
  try {
    await deleteDoc(doc(db, 'plans', planId));
  } catch (error) {
    console.error('計画書の削除に失敗しました:', error);
    throw error;
  }
}


// ==========================================
// 4. ファイルアップロード (Firebase Storage)
// ==========================================

export async function uploadPlanFile(planId: string, file: File): Promise<string> {
  try {
    const timestamp = Date.now();
    const storageRef = ref(storage, `plans/${planId}/${timestamp}_${file.name}`);
    
    // ファイルのアップロード実行
    const snapshot = await uploadBytes(storageRef, file);
    
    // ダウンロードURLの取得
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error('ファイルのアップロードに失敗しました:', error);
    throw error;
  }
}