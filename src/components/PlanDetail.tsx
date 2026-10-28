// src/components/PlanDetail.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Users, Check, Save, Plus, X, Upload, Trash2, Printer, AlertCircle, Phone, FileText, ShieldAlert, MessageSquare, Send } from 'lucide-react';
import type { Member, MountainPlan } from '../types';
import { db, updatePlanInDb, uploadPlanFile, deletePlanFromDb } from '../services/firestore';
import { doc, getDoc } from 'firebase/firestore';

interface PlanDetailProps {
  planId: string;
  members: Member[];
  onBack: () => void;
}

const DEFAULT_EQUIPMENTS = [
  'ピッケル', 'アイゼン', 'ヘルメット', 'ツェルト', 
  'ヘッドランプ', '防寒着', '雨具（上下）', '救急セット', 
  '非常食', '地図・コンパス', 'GPS・スマホ'
];

export default function PlanDetail({ planId, members, onBack }: PlanDetailProps) {
  const [plan, setPlan] = useState<MountainPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フォーム編集用の状態
  const [title, setTitle] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [routes, setRoutes] = useState('');
  const [escapeRoute, setEscapeRoute] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [customEquipmentInput, setCustomEquipmentInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; url: string; date: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<{ memberId: string; role: string }[]>([]);

  // 審査コメント用の状態
  const [comments, setComments] = useState<{ sender: string; text: string; date: string }[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  // 計画データの取得 ＆ 自動ステータス遷移
  useEffect(() => {
    async function fetchPlan() {
      try {
        const docRef = doc(db, 'plans', planId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          let data = { id: docSnap.id, ...docSnap.data() } as MountainPlan;
          
          // ① pending (審査待ち) を開く -> under_review (審査中)
          if (data.status === 'pending') {
            await updatePlanInDb(docSnap.id, { status: 'under_review' });
            data.status = 'under_review';
          } 
          // ② changes_requested (修正待ち) を開く -> in_revision (修正中)
          else if (data.status === 'changes_requested') {
            await updatePlanInDb(docSnap.id, { status: 'in_revision' });
            data.status = 'in_revision';
          }

          setPlan(data);
          
          // フォーム初期値の設定
          setTitle(data.title || '');
          setCreatorName(data.creatorName || '');
          setStartDate(data.startDate || '');
          setEndDate(data.endDate || '');
          setRoutes(data.routes || '');
          setEscapeRoute(data.escapeRoute || '');
          setEmergencyContact(data.emergencyContact || '');
          setSelectedEquipments(data.equipments || []);
          setAttachedFiles(data.files || []);
          setComments(data.comments || []);

          // 参加メンバーのマッピング復元
          if (data.participants) {
            const mapped = data.participants.map(p => {
              const found = members.find(m => m.name === p.name);
              return {
                memberId: found ? found.id : 'unknown',
                role: p.role
              };
            }).filter(p => p.memberId !== 'unknown');
            setSelectedParticipants(mapped);
          }
        }
      } catch (error) {
        console.error('計画書の取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [planId, members]);

  // 装備のトグル
  const handleToggleEquipment = (item: string) => {
    if (selectedEquipments.includes(item)) {
      setSelectedEquipments(selectedEquipments.filter(e => e !== item));
    } else {
      setSelectedEquipments([...selectedEquipments, item]);
    }
  };

  const handleAddCustomEquipment = () => {
    if (!customEquipmentInput.trim()) return;
    const trimmed = customEquipmentInput.trim();
    if (!selectedEquipments.includes(trimmed)) {
      setSelectedEquipments([...selectedEquipments, trimmed]);
    }
    setCustomEquipmentInput('');
  };

  // ファイルアップロード
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const downloadUrl = await uploadPlanFile(planId, file);
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

  // メンバー選択・役割変更
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

  // 更新・保存処理 (下書き保存 or 提出)
  const handleSaveOrSubmit = async (targetStatus: 'draft' | 'pending') => {
    if (isSubmitting || !plan) return;
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

      await updatePlanInDb(plan.id, {
        title,
        creatorName,
        status: targetStatus,
        startDate,
        endDate: endDate || startDate,
        routes,
        escapeRoute,
        equipments: selectedEquipments,
        files: attachedFiles,
        emergencyContact,
        participants: participantsList,
        participantCount: participantsList.length,
      });

      alert(targetStatus === 'pending' ? '山行計画書を提出しました！' : '計画書を保存しました！');
      onBack();
    } catch (error) {
      console.error('更新に失敗しました:', error);
      alert('更新に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 審査コメントの送信
  const handleSendComment = async () => {
    if (!newCommentText.trim() || !plan) return;
    const updatedComments = [
      ...comments,
      {
        sender: 'レビュアー / 管理者',
        text: newCommentText.trim(),
        date: new Date().toLocaleDateString('ja-JP') + ' ' + new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      }
    ];

    try {
      await updatePlanInDb(plan.id, { comments: updatedComments });
      setComments(updatedComments);
      setNewCommentText('');
    } catch (error) {
      console.error('コメントの送信に失敗しました:', error);
      alert('コメントの送信に失敗しました。');
    }
  };

  // 審査アクション (承認 or 修正依頼)
  const handleChangeStatus = async (newStatus: 'approved' | 'changes_requested') => {
    if (!plan) return;

    if (newStatus === 'changes_requested' && !newCommentText.trim() && comments.length === 0) {
      alert('修正依頼を送信する場合は、修正内容に関するコメントを入力してください。');
      return;
    }

    try {
      let updatedComments = comments;
      if (newCommentText.trim()) {
        updatedComments = [
          ...comments,
          {
            sender: 'レビュアー / 管理者',
            text: newCommentText.trim(),
            date: new Date().toLocaleDateString('ja-JP') + ' ' + new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
          }
        ];
      }

      await updatePlanInDb(plan.id, { 
        status: newStatus,
        comments: updatedComments 
      });

      setPlan({ ...plan, status: newStatus, comments: updatedComments });
      setComments(updatedComments);
      setNewCommentText('');

      alert(newStatus === 'approved' ? '計画書を承認しました！' : '修正依頼を送信しました。');
      onBack();
    } catch (error) {
      console.error(error);
      alert('ステータスの更新に失敗しました。');
    }
  };

  // 削除処理
  const handleDelete = async () => {
    if (!plan || !confirm('この計画書を削除しますか？')) return;
    try {
      await deletePlanFromDb(plan.id);
      alert('削除しました。');
      onBack();
    } catch (error) {
      console.error(error);
      alert('削除に失敗しました。');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">読み込み中...</div>;
  }

  if (!plan) {
    return <div className="p-8 text-center text-xs text-stone-400">計画書が見つかりませんでした。</div>;
  }

  const isEditable = plan.status === 'draft' || plan.status === 'in_revision';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800">承認</span>;
      case 'under_review':
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800">審査中</span>;
      case 'pending':
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800">審査待ち</span>;
      case 'changes_requested':
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-rose-100 text-rose-800">修正待ち</span>;
      case 'in_revision':
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-orange-100 text-orange-800">修正中</span>;
      case 'draft':
      default:
        return <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-stone-200 text-stone-700">作成中</span>;
    }
  };

  return (
    <div className="space-y-4 font-sans text-stone-700 pb-12 print:pb-0 print:space-y-2">
      {/* ナビゲーション・ヘッダー (印刷時は非表示) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-sm print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800 transition"
        >
          <ArrowLeft size={16} />
          一覧に戻る
        </button>

        <div className="flex items-center gap-2">
          {getStatusBadge(plan.status)}
        </div>

        <div className="flex items-center gap-1.5">
          {isEditable ? (
            <>
              {plan.status === 'draft' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-600 rounded-xl text-xs transition"
                  title="削除"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrSubmit('draft')}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
              >
                <Save size={13} />
                下書き保存
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrSubmit('pending')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition"
              >
                <Check size={13} />
                提出する
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
            >
              <Printer size={14} />
              印刷 / PDF
            </button>
          )}
        </div>
      </div>

      {isEditable ? (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-2 text-xs text-amber-800">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>
              {plan.status === 'in_revision' 
                ? '修正中モードです。内容を修正したのち「提出する」ボタンを押してください。' 
                : '作成中（下書き）です。全項目を編集できます。'}
            </span>
          </div>

          {comments.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} className="text-rose-600" />
                審査コメント・修正指示履歴
              </h3>
              <div className="space-y-2">
                {comments.map((c, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold">
                      <span>{c.sender}</span>
                      <span>{c.date}</span>
                    </div>
                    <p className="text-stone-700 whitespace-pre-wrap">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">基本情報</h3>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">山行タイトル・山名</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">企画者名</label>
              <input
                type="text"
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

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">行程詳細・エスケープルート</h3>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">行動予定・タイムスケジュール</label>
              <textarea
                rows={4}
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

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">携行装備の選択</h3>
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

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="追加装備を入力"
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

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Upload size={14} className="text-emerald-600" />
              関連資料・地図ファイルの添付
            </h3>
            <div className="flex items-center gap-2">
              <label className={`px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload size={14} />
                {isUploading ? 'アップロード中...' : 'ファイルを選択して追加'}
                <input type="file" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            {attachedFiles.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs">
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 hover:underline truncate max-w-[80%]">
                      📄 {file.name}
                    </a>
                    <button type="button" onClick={() => handleRemoveFile(index)} className="text-stone-400 hover:text-rose-600 p-1">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">緊急時連絡先</h3>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      ) : (
        /* ================= 閲覧モード ＋ 印刷用最適化レイアウト ================= */
        <div className="space-y-4 print:space-y-3">
          
          {/* 印刷専用のタイトルヘッダー（通常時は非表示、印刷時のみ上部に表示） */}
          <div className="hidden print:block text-center border-b-2 border-stone-800 pb-3 mb-4">
            <h1 className="text-xl font-black tracking-widest text-stone-900">山 行 計 画 書</h1>
            <p className="text-[10px] text-stone-500 mt-0.5">山岳会公式提出書類</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">
            <div>
              <h2 className="text-base font-bold text-stone-800 print:text-lg">{plan.title || '(無題の計画書)'}</h2>
              <p className="text-xs text-stone-400 mt-0.5 print:text-black">企画者: {plan.creatorName || '未設定'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-stone-50 p-4 rounded-xl border border-stone-200 print:bg-white print:border-stone-400">
              <div>
                <span className="text-stone-400 block mb-0.5">山行日程</span>
                <span className="font-bold text-stone-700 flex items-center gap-1 print:text-black">
                  <Calendar size={14} className="text-emerald-600 print:hidden" />
                  {plan.startDate || '未定'} 〜 {plan.endDate || plan.startDate || '未定'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5">参加人数</span>
                <span className="font-bold text-stone-700 flex items-center gap-1 print:text-black">
                  <Users size={14} className="text-emerald-600 print:hidden" />
                  {plan.participants?.length || 0}名
                </span>
              </div>
            </div>

            {/* 参加者一覧 */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider print:text-stone-800">参加メンバー</h3>
              <div className="space-y-1.5 print:space-y-1">
                {plan.participants && plan.participants.length > 0 ? (
                  plan.participants.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs print:bg-white print:border-stone-300 print:py-1">
                      <span className="font-bold text-stone-800">{p.name}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px] print:bg-transparent print:text-black print:border print:border-stone-400">{p.role}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-400 p-2">参加メンバーの登録はありません</p>
                )}
              </div>
            </div>

            {/* 行程詳細 */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider print:text-stone-800">行動予定・タイムスケジュール</h3>
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono whitespace-pre-wrap print:bg-white print:border-stone-400">
                {plan.routes || '記載なし'}
              </div>
            </div>

            {/* エスケープルート */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1 print:text-stone-800">
                <ShieldAlert size={14} className="text-amber-600 print:hidden" />
                エスケープルート・悪天候時の判断
              </h3>
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs whitespace-pre-wrap print:bg-white print:border-stone-400">
                {plan.escapeRoute || '記載なし'}
              </div>
            </div>

            {/* 携行装備 */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider print:text-stone-800">携行装備</h3>
              <div className="flex flex-wrap gap-1.5">
                {plan.equipments && plan.equipments.length > 0 ? (
                  plan.equipments.map((eq, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium print:bg-white print:border print:border-stone-300">
                      {eq}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-stone-400 p-2">携行装備の登録はありません</p>
                )}
              </div>
            </div>

            {/* 添付ファイル (印刷時はURLの代わりにファイル名のみリスト表示) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1 print:text-stone-800">
                <FileText size={14} className="text-emerald-600 print:hidden" />
                関連資料・地図ファイル
              </h3>
              {plan.files && plan.files.length > 0 ? (
                <div className="space-y-1.5">
                  {plan.files.map((file, idx) => (
                    <div key={idx} className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 print:bg-white print:border-stone-300">
                      📄 {file.name} ({file.date || '日付不明'})
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 p-2">添付されたファイルはありません</p>
              )}
            </div>

            {/* 緊急時連絡先 */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1 print:text-stone-800">
                <Phone size={14} className="text-rose-600 print:hidden" />
                緊急時連絡先
              </h3>
              <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl text-xs font-bold text-stone-800 print:bg-white print:border-stone-400">
                {plan.emergencyContact || '未登録'}
              </div>
            </div>

            {/* 印刷時のサイン欄（紙で提出・確認する場合に便利） */}
            <div className="hidden print:block pt-8 mt-6 border-t border-stone-400">
              <div className="flex justify-between text-xs text-stone-600">
                <div>確認印（リーダー）: ___________________</div>
                <div>確認印（山岳会役員）: ___________________</div>
              </div>
            </div>
          </div>

          {/* 審査コメント・アクションセクション (印刷時は完全非表示 print:hidden) */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 print:hidden">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={14} className="text-emerald-600" />
              審査コメント・修正依頼のやり取り
            </h3>

            <div className="space-y-2">
              {comments.length > 0 ? (
                comments.map((c, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold">
                      <span>{c.sender}</span>
                      <span>{c.date}</span>
                    </div>
                    <p className="text-stone-700 whitespace-pre-wrap">{c.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400 p-2">まだコメントはありません</p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-100">
              <textarea
                rows={2}
                placeholder="審査コメントや修正指示を入力..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleChangeStatus('changes_requested')}
                    className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition"
                  >
                    ④ 修正依頼を送る
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeStatus('approved')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    ③ 承認する
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSendComment}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Send size={14} />
                  コメント送信
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}