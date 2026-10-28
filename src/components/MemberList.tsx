import React, { useState } from 'react';
import { UserPlus, UserCheck, Phone, ShieldCheck, Edit2, Trash2, ArrowLeft, Check, X } from 'lucide-react';
import type { Member } from '../types';

// 初期サンプルメンバーデータ
export const initialMembers: Member[] = [
  { id: 'm1', name: '新井 理弘', roleInClub: '役員', emergencyPhone: '090-1234-5678', isApprover: true },
  { id: 'm2', name: '新井 亜生', roleInClub: '一般会員', emergencyPhone: '090-8765-4321', isApprover: false },
  { id: 'm3', name: '山田 太郎', roleInClub: '安全管理委員', emergencyPhone: '080-1111-2222', isApprover: true },
  { id: 'm4', name: '佐藤 花子', roleInClub: '一般会員', emergencyPhone: '080-3333-4444', isApprover: false },
];

interface MemberListProps {
  members: Member[];
  onAddMember: (member: Omit<Member, 'id'>) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onBack: () => void;
}

export default function MemberList({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onBack,
}: MemberListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // フォーム用ステート
  const [name, setName] = useState('');
  const [roleInClub, setRoleInClub] = useState<'役員' | '一般会員' | '安全管理委員'>('一般会員');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [isApprover, setIsApprover] = useState(false);

  const resetForm = () => {
    setName('');
    setRoleInClub('一般会員');
    setEmergencyPhone('');
    setIsApprover(false);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleStartEdit = (member: Member) => {
    setEditingId(member.id);
    setName(member.name);
    setRoleInClub(member.roleInClub);
    setEmergencyPhone(member.emergencyPhone);
    setIsApprover(member.isApprover);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      onUpdateMember({
        id: editingId,
        name,
        roleInClub,
        emergencyPhone,
        isApprover,
      });
    } else {
      onAddMember({
        name,
        roleInClub,
        emergencyPhone,
        isApprover,
      });
    }
    resetForm();
  };

  return (
    <div className="space-y-4 font-sans text-stone-700 pb-12">
      {/* ヘッダー */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800 transition"
        >
          <ArrowLeft size={16} />
          メインに戻る
        </button>
        <h2 className="text-sm font-bold text-stone-800">山岳会 メンバー管理</h2>
        <button
          type="button"
          onClick={() => {
            if (isFormOpen) resetForm();
            else setIsFormOpen(true);
          }}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition"
        >
          <UserPlus size={14} />
          {isFormOpen ? '閉じる' : '新規登録'}
        </button>
      </div>

      {/* 登録・編集フォーム */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-md space-y-3">
          <h3 className="text-xs font-bold text-emerald-800 flex items-center gap-1">
            {editingId ? <Edit2 size={14} /> : <UserPlus size={14} />}
            {editingId ? 'メンバー情報の編集' : '新規メンバー登録'}
          </h3>

          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-stone-500 font-medium mb-1">氏名</label>
              <input
                type="text"
                required
                placeholder="例: 山田 太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-stone-500 font-medium mb-1">会内役職</label>
                <select
                  value={roleInClub}
                  onChange={(e) => setRoleInClub(e.target.value as any)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-500"
                >
                  <option value="一般会員">一般会員</option>
                  <option value="役員">役員</option>
                  <option value="安全管理委員">安全管理委員</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-500 font-medium mb-1">緊急連絡先 (電話)</label>
                <input
                  type="tel"
                  placeholder="090-0000-0000"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <input
                type="checkbox"
                id="isApprover"
                checked={isApprover}
                onChange={(e) => setIsApprover(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="isApprover" className="text-stone-700 font-medium cursor-pointer">
                計画書の審査・承認権限を付与する
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
            >
              <Check size={14} />
              {editingId ? '更新する' : '登録する'}
            </button>
          </div>
        </form>
      )}

      {/* メンバー一覧カード */}
      <div className="space-y-2">
        <p className="text-[10px] text-stone-400 font-bold px-1">登録済みメンバー ({members.length}名)</p>
        
        {members.map((m) => (
          <div key={m.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-800 text-sm">{m.name}</span>
                <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-medium">
                  {m.roleInClub}
                </span>
                {m.isApprover && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                    <ShieldCheck size={11} /> 承認者
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-stone-500">
                <Phone size={12} className="text-stone-400" />
                <span>緊急連絡先: {m.emergencyPhone || '未設定'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStartEdit(m)}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition"
                title="編集"
              >
                <Edit2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`${m.name} さんを削除しますか？`)) {
                    onDeleteMember(m.id);
                  }
                }}
                className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="削除"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}