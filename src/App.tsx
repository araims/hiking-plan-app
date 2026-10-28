import React, { useState, useEffect } from 'react';
import PlanList from './components/PlanList';
import PlanCreate from './components/PlanCreate';
import PlanDetail from './components/PlanDetail';
import MemberList from './components/MemberList';
import type { Member, MountainPlan } from './types';
import { 
  subscribeMembers, 
  addMemberToDb, 
  updateMemberInDb, 
  deleteMemberFromDb,
  subscribePlans 
} from './services/firestore';
import { Users } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'detail' | 'members'>('list');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Firestoreから取得するリアルタイムデータ
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MountainPlan[]>([]);

  // 起動時に Firestore とリアルタイム同期を開始
  useEffect(() => {
    const unsubscribeMembers = subscribeMembers((data) => setMembers(data));
    const unsubscribePlans = subscribePlans((data) => setPlans(data));

    return () => {
      unsubscribeMembers();
      unsubscribePlans();
    };
  }, []);

  // メンバー操作
  const handleAddMember = async (newMember: Omit<Member, 'id'>) => {
    await addMemberToDb(newMember);
  };

  const handleUpdateMember = async (updated: Member) => {
    await updateMemberInDb(updated);
  };

  const handleDeleteMember = async (id: string) => {
    await deleteMemberFromDb(id);
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 max-w-xl mx-auto font-sans">
      
      {/* ナビゲーションボタン */}
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => setCurrentView(currentView === 'members' ? 'list' : 'members')}
          className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
        >
          <Users size={14} className="text-emerald-600" />
          {currentView === 'members' ? '計画書一覧へ' : `会メンバー管理 (${members.length})`}
        </button>
      </div>

      {currentView === 'list' && (
        <PlanList
          plans={plans} // Firestoreのデータを引き渡す
          onCreateNew={() => setCurrentView('create')}
          onSelectPlan={(id) => {
            setSelectedPlanId(id);
            setCurrentView('detail');
          }}
        />
      )}

      {currentView === 'create' && (
        <PlanCreate
          members={members}
          onBack={() => setCurrentView('list')}
          onSaveSuccess={() => setCurrentView('list')}
        />
      )}

      {currentView === 'detail' && selectedPlanId && (
        <PlanDetail
          planId={selectedPlanId}
          members={members}
          onBack={() => setCurrentView('list')}
        />
      )}

      {currentView === 'members' && (
        <MemberList
          members={members}
          onAddMember={handleAddMember}
          onUpdateMember={handleUpdateMember}
          onDeleteMember={handleDeleteMember}
          onBack={() => setCurrentView('list')}
        />
      )}
    </div>
  );
}