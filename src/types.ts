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
  roleInClub: '役員' | '一般会員' | '安全管理委員'; // 会内での役職
  emergencyPhone: string;
  isApprover: boolean; // 承認権限を持つか（安全管理委員・役員など）
}

// 装備マスターの例
export const DEFAULT_EQUIPMENTS = [
    'ピッケル', 'アイゼン', 'ヘルメット', 'ツェルト', 
    'ヘッドランプ', '防寒着', '雨具（上下）', '救急セット', 
    '非常食', '地図・コンパス', 'GPS・スマホ'
  ];