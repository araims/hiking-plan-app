import React, { useState } from 'react';
import { ArrowLeft, Users, Check, Save, Plus, X, Upload } from 'lucide-react';
import type { Member } from '../types';
import { createPlanInDb, uploadPlanFile } from '../services/firestore';

interface PlanCreateProps {
  members: Member[];
  onBack: () => void;
  onSaveSuccess: () => void;
}

// 定番装備マスター一覧
const DEFAULT_EQUIPMENTS = [
  'ピッケル', 'アイゼン', 'ヘルメット', 'ツェルト', 
  'ヘッドランプ', '防寒着', '雨具（上下）', '救急セット', 
  '非常食', '地図・コンパス', 'GPS・スマホ'
];

export default function PlanCreate({ members, onBack, onSaveSuccess }: PlanCreateProps) {
  const [title, setTitle] = useState('');
  const [creatorName, setCreatorName] = useState('新井 理弘');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [routes, setRoutes] = useState('');
  const [escapeRoute, setEscapeRoute] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('富良野警察署山岳遭難係 / 0167-39-0110');
  
  // 装備選択用（デフォルトで主要なものを選択状態に）
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([
    'ピッケル', 'アイゼン', 'ヘルメット', 'ツェルト'
  ]);
  const [customEquipmentInput, setCustomEquipmentInput] = useState('');

  // ファイル添付用
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; url: string; date: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedParticipants, setSelectedParticipants] = useState<{ memberId: string; role: string }[]>(
    members.length > 0 ? [{ memberId: members[0].id, role: 'CL' }] : []
  );

  const handleToggleMember = (memberId: string) => {
    const exists = selectedParticipants.find((p) => p.memberId === memberId);
    if (exists) {
      setSelectedParticipants(selectedParticipants.filter((p) => p.memberId !== memberId));
    } else {
      setSelectedParticipants([...selectedParticipants, { memberId, role: '一般' }]);
    }
  };

  const handleRoleChange = (memberId: string, role: string) => {
    setSelectedParticipants(
      selectedParticipants.map((p) => (p.memberId === memberId ? { ...p, role } : p))
    );
  };

  // 装備のトグル選択
  const handleToggleEquipment = (item: string) => {
    if (selectedEquipments.includes(item)) {
      setSelectedEquipments(selectedEquipments.filter(e => e !== item));
    } else {
      setSelectedEquipments([...selectedEquipments, item]);
    }
  };

  // 自由記入装備の追加
  const handleAddCustomEquipment = () => {
    if (!customEquipmentInput.trim()) return;
    const trimmed = customEquipmentInput.trim();
    if (!selectedEquipments.includes(trimmed)) {
      setSelectedEquipments([...selectedEquipments, trimmed]);
    }
    setCustomEquipmentInput('');
  };

  // ファイルアップロード処理
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 一時的なIDまたはプレフィックスでストレージに保存
      const tempId = 'temp_' + Date.now();
      const downloadUrl = await uploadPlanFile(tempId, file);
      
      setAttachedFiles([
        ...attachedFiles,
        {
          name: file.name,
          url: downloadUrl,
          date: new Date().toLocaleDateString('ja-JP')
        }
      ]);
      alert('ファイルを添付しました！');
    } catch (error) {
      console.error(error);
      alert('ファイルのアップロードに失敗しました。');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  // 保存処理（'draft' または 'pending'）
  const handleSaveWithStatus = async (targetStatus: 'draft' | 'pending') => {
    if (isSubmitting) return;

    if (!title.trim() || !startDate) {
      alert('山行タイトルと開始日は必須です。');
      return;
    }

    setIsSubmitting(true);

    try {
      const participantsList = selectedParticipants.map(sp => {
        const found = members.find(m => m.id === sp.memberId);
        return {
          name: found ? found.name : '不明なメンバー',
          role: sp.role
        };
      });

      await createPlanInDb({
        title,
        creatorName,
        status: targetStatus, // 'draft' または 'pending'
        startDate,
        endDate: endDate || startDate,
        routes,
        escapeRoute,
        equipments: selectedEquipments,
        files: attachedFiles,
        emergencyContact,
        participants: participantsList,
        comments: [],
      });

      alert(targetStatus === 'pending' ? '山行計画書を提出しました！' : '下書きとして保存しました！');
      onSaveSuccess();
    } catch (error) {
      console.error('保存に失敗しました:', error);
      alert('保存に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-stone-700 pb-12">
      {/* ヘッダー */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-sm print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800 transition"
        >
          <ArrowLeft size={16} />
          一覧に戻る
        </button>
        <span className="text-xs font-bold text-stone-800">新規山行計画書の作成</span>
        
        {/* 保存・提出ボタン群 */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSaveWithStatus('draft')} // 下書き保存
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
          >
            <Save size={13} />
            下書き保存
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSaveWithStatus('pending')} // 提出
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition"
          >
            <Check size={13} />
            提出する
          </button>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">基本情報</h3>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">山行タイトル・山名</label>
          <input
            type="text"
            required
            placeholder="例: 十勝岳 連峰縦走計画"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">企画者名</label>
          <input
            type="text"
            required
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">開始日</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 参加メンバーの選択 */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
          <Users size={14} className="text-emerald-600" />
          参加メンバー・役割の選択
        </h3>
        <div className="space-y-2 pt-1">
          {members.map((m) => {
            const isSelected = selectedParticipants.some((p) => p.memberId === m.id);
            const participantObj = selectedParticipants.find((p) => p.memberId === m.id);

            return (
              <div 
                key={m.id} 
                className={`p-3 rounded-xl border text-xs flex items-center justify-between transition ${
                  isSelected ? 'bg-emerald-50/50 border-emerald-200' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleMember(m.id)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-stone-800">{m.name}</span>
                    <span className="text-[10px] text-stone-400 ml-1.5">({m.roleInClub})</span>
                  </div>
                </div>

                {isSelected && (
                  <select
                    value={participantObj?.role || '一般'}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    className="p-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="CL">CL (リーダー)</option>
                    <option value="SL">SL (サブ)</option>
                    <option value="一般">一般参加</option>
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 行程詳細 */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">行程詳細・エスケープルート</h3>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">行動予定・タイムスケジュール</label>
          <textarea
            rows={4}
            placeholder="例: 1日目 望岳台(07:00) 〜 十勝岳避難小屋(10:00)..."
            value={routes}
            onChange={(e) => setRoutes(e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">エスケープルート・悪天候時の判断</label>
          <textarea
            rows={2}
            value={escapeRoute}
            onChange={(e) => setEscapeRoute(e.target.value)}
            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 携行装備（マスター選択 ＋ 自由記入） */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">携行装備の選択</h3>
        <p className="text-[11px] text-stone-400">装備一覧から選択するか、下の入力欄から追加してください。</p>
        
        {/* マスター一覧チェックボックス */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {DEFAULT_EQUIPMENTS.map((item) => {
            const isChecked = selectedEquipments.includes(item);
            return (
              <label
                key={item}
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition ${
                  isChecked ? 'bg-emerald-50/50 border-emerald-300 font-bold text-emerald-900' : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleEquipment(item)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="truncate">{item}</span>
              </label>
            );
          })}
        </div>

        {/* リストにないものの自由記入追加 */}
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            placeholder="一覧にない装備を追加（例: テン泊装備一式）"
            value={customEquipmentInput}
            onChange={(e) => setCustomEquipmentInput(e.target.value)}
            className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={handleAddCustomEquipment}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition"
          >
            <Plus size={14} /> 追加
          </button>
        </div>

        {/* 選択されている装備のプレビュータグ */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-100">
          {selectedEquipments.map((eq) => (
            <span
              key={eq}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg text-[11px] font-medium"
            >
              {eq}
              <button
                type="button"
                onClick={() => setSelectedEquipments(selectedEquipments.filter(e => e !== eq))}
                className="text-stone-400 hover:text-rose-600"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* ファイル添付セクション */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
          <Upload size={14} className="text-emerald-600" />
          関連資料・地図ファイルの添付
        </h3>
        
        <div className="flex items-center gap-2">
          <label className={`px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={14} />
            {isUploading ? 'アップロード中...' : 'ファイルを選択して追加'}
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <span className="text-[10px] text-stone-400">PDF、画像などのルート図・資料</span>
        </div>

        {attachedFiles.length > 0 && (
          <div className="space-y-1.5 pt-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs">
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 hover:underline truncate max-w-[80%]">
                  📄 {file.name} <span className="text-[10px] text-stone-400 font-normal">({file.date})</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-stone-400 hover:text-rose-600 p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 緊急連絡先 */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">緊急時連絡先</h3>
        <div>
          <input
            type="text"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}