export type PlanStatus = 
  | 'draft'             // 作成中
  | 'pending'           // 審査待ち
  | 'under_review'      // 審査中
  | 'changes_requested' // 修正待ち
  | 'in_revision'       // 修正中
  | 'approved';         // 承認

export interface MountainPlan {
  id: string;
  title: string;
  creatorName: string;
  status: PlanStatus;
  startDate: string;
  endDate: string;
  participantCount: number;
  approversCount: number;
  requiredApprovals: number;
  updatedAt: string;
}

// 追加: 会員メンバーの型
export interface Member {
  id: string;
  name: string;
  roleInClub: '役員' | '一般会員' | '安全管理委員';
  address?: string;      // 住所
  birthDate?: string;    // 生年月日
  phone?: string;        // 本人電話番号
  emergencyPhone: string; // 緊急連絡先
  isApprover: boolean;
}

// 計画書内の参加者データ型
export interface PlanParticipant {
  name: string;
  role: string;
  address?: string;      // 住所を追加
  birthDate?: string;    // 生年月日を追加
  phone?: string;        // 電話番号を追加
  emergencyPhone?: string; // 緊急連絡先を追加
}

// 装備マスターの例
export const DEFAULT_EQUIPMENTS = [
    'ピッケル', 'アイゼン', 'ヘルメット', 'ツェルト', 
    'ヘッドランプ', '防寒着', '雨具（上下）', '救急セット', 
    '非常食', '地図・コンパス', 'GPS・スマホ'
  ];