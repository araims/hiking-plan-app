import React, { useState } from 'react';
import { Plus, Calendar, Users, ChevronRight, Search } from 'lucide-react';
import type { MountainPlan } from '../types';

interface PlanListProps {
  plans: MountainPlan[];
  onSelectPlan: (planId: string) => void;
  onCreateNew: () => void;
}

export default function PlanList({ plans = [], onSelectPlan, onCreateNew }: PlanListProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 検索とステータスフィルターの適用
  const filteredPlans = plans.filter(plan => {
    // 修正待ち(changes_requested)と修正中(in_revision)は「修正待ち」タブでまとめて扱えると便利なので柔軟に判定
    const matchesStatus = 
      filterStatus === 'all' || 
      plan.status === filterStatus || 
      (filterStatus === 'changes_requested' && (plan.status === 'changes_requested' || plan.status === 'in_revision'));

    const matchesQuery = (plan.title || '').includes(searchQuery) || (plan.creatorName || '').includes(searchQuery);
    return matchesStatus && matchesQuery;
  });

  // ステータスに応じたバッジ表示
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">承認</span>;
      case 'changes_requested':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">修正待ち</span>;
      case 'in_revision':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">修正中</span>;
      case 'under_review':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">審査中</span>;
      case 'draft':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">作成中</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">審査待ち</span>;
    }
  };

  return (
    <div className="space-y-4 font-sans text-stone-700 pb-12">
      
      {/* トップヘッダー & 新規作成ボタン (① 新規作成) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-stone-800">山行計画書 一覧</h2>
          <p className="text-[10px] text-stone-400">提出済み・作成中の計画書確認</p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus size={16} />
          新規作成
        </button>
      </div>

      {/* 検索・フィルターバー */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="山名や企画者名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* フィルタータブ */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'すべて' },
            { id: 'draft', label: '作成中' },
            { id: 'pending', label: '審査待ち' },
            { id: 'under_review', label: '審査中' },
            { id: 'changes_requested', label: '修正待ち' },
            { id: 'approved', label: '承認' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition ${
                filterStatus === tab.id
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 計画書カード一覧 */}
      <div className="space-y-2">
        <p className="text-[10px] text-stone-400 font-bold px-1">
          表示中の計画書 ({filteredPlans.length}件)
        </p>

        {filteredPlans.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center space-y-2">
            <p className="text-xs text-stone-500 font-medium">該当する計画書はありません</p>
            <p className="text-[10px] text-stone-400">「新規作成」ボタンから新しい計画書を作成してください。</p>
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => onSelectPlan(plan.id)}
              className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm hover:border-emerald-300 transition cursor-pointer space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  {getStatusBadge(plan.status)}
                  <h3 className="text-sm font-bold text-stone-800 mt-1">{plan.title || '(無題の計画書)'}</h3>
                </div>
                <ChevronRight size={18} className="text-stone-400 mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-500 pt-1 border-t border-stone-100">
                <div className="flex items-center gap-1">
                  <Calendar size={13} className="text-stone-400" />
                  <span>{plan.startDate || '日程未定'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={13} className="text-stone-400" />
                  <span>企画: {plan.creatorName} ({plan.participantCount}名)</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}