export type Role = 'CEO' | 'COO' | 'CMO' | 'CFO' | 'Manager' | 'Senior' | 'Staff' | 'AI-Agent';

export type Department =
  | '経営'
  | 'マーケティング戦略'
  | 'クリエイティブ'
  | 'デジタル広告'
  | 'データ分析'
  | '営業'
  | 'PR・広報'
  | 'カスタマーサクセス';

export interface Member {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  department: Department;
  avatar: string;
  isAI: boolean;
  status: 'online' | 'busy' | 'away' | 'offline';
  skills: string[];
  description: string;
  reports?: string[];
  reportsTo?: string;
  aiCapabilities?: string[];
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'planning' | 'review' | 'completed';
  progress: number;
  deadline: string;
  team: string[];
  department: Department;
  budget: string;
  description: string;
  tags: string[];
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'review' | 'done';
  dueDate: string;
  isAITask: boolean;
}

export interface ChatMessage {
  id: string;
  from: string;
  content: string;
  time: string;
  isAI: boolean;
}

export const members: Member[] = [
  {
    id: 'ceo',
    name: '今時 花子',
    nameEn: 'Hanako Imadoki',
    role: 'CEO / 代表取締役',
    department: '経営',
    avatar: '👩‍💼',
    isAI: false,
    status: 'online',
    skills: ['経営戦略', 'ブランディング', 'リーダーシップ'],
    description: '株式会社IMADOKIの代表。マーケティング業界15年のキャリアを持つ。',
    reports: ['coo', 'cmo', 'cfo'],
  },
  {
    id: 'coo',
    name: 'AI-Ops α',
    nameEn: 'AI Operations Alpha',
    role: 'COO / 最高執行責任者',
    department: '経営',
    avatar: '🤖',
    isAI: true,
    status: 'online',
    skills: ['オペレーション最適化', 'KPI管理', 'プロセス自動化'],
    description: '社内業務フロー全体を監視・最適化するAIエージェント。24時間稼働でオペレーションを管理。',
    reportsTo: 'ceo',
    reports: ['pm-ai', 'cs-ai'],
    aiCapabilities: ['業務効率化提案', 'KPIレポート自動生成', 'リソース配分最適化'],
  },
  {
    id: 'cmo',
    name: 'AI-Marketing β',
    nameEn: 'AI Marketing Beta',
    role: 'CMO / 最高マーケティング責任者',
    department: 'マーケティング戦略',
    avatar: '🤖',
    isAI: true,
    status: 'online',
    skills: ['マーケティング戦略', 'データドリブン', 'トレンド分析'],
    description: '市場トレンドをリアルタイムで分析し、最適なマーケティング戦略を立案するAI。',
    reportsTo: 'ceo',
    reports: ['strategy-ai', 'data-ai'],
    aiCapabilities: ['市場分析', 'キャンペーン設計', '競合リサーチ自動化'],
  },
  {
    id: 'cfo',
    name: '数字 太郎',
    nameEn: 'Taro Suuji',
    role: 'CFO / 最高財務責任者',
    department: '経営',
    avatar: '👨‍💼',
    isAI: false,
    status: 'busy',
    skills: ['財務管理', '予算計画', 'リスク管理'],
    description: '財務戦略全般を担当。スタートアップから上場企業まで幅広い経験を持つ。',
    reportsTo: 'ceo',
  },
  {
    id: 'strategy-ai',
    name: 'AI-Strategy γ',
    nameEn: 'AI Strategy Gamma',
    role: 'マーケティング戦略ディレクター',
    department: 'マーケティング戦略',
    avatar: '🤖',
    isAI: true,
    status: 'online',
    skills: ['戦略立案', 'ROI最適化', 'ファネル設計'],
    description: 'データに基づいたマーケティング戦略を自動立案。A/Bテストの設計・分析も担当。',
    reportsTo: 'cmo',
    aiCapabilities: ['戦略ドキュメント自動生成', 'A/Bテスト設計', 'ROI予測モデル'],
  },
  {
    id: 'creative-lead',
    name: '創造 美咲',
    nameEn: 'Misaki Sozo',
    role: 'クリエイティブディレクター',
    department: 'クリエイティブ',
    avatar: '👩‍🎨',
    isAI: false,
    status: 'online',
    skills: ['ビジュアルデザイン', 'ブランド戦略', 'コンセプトメイキング'],
    description: 'ブランドのビジュアルアイデンティティを構築。国内外の受賞歴あり。',
    reportsTo: 'cmo',
    reports: ['creative-ai'],
  },
  {
    id: 'creative-ai',
    name: 'AI-Creative δ',
    nameEn: 'AI Creative Delta',
    role: 'クリエイティブAIアシスタント',
    department: 'クリエイティブ',
    avatar: '🤖',
    isAI: true,
    status: 'online',
    skills: ['画像生成', 'コピーライティング', 'デザイン提案'],
    description: 'クリエイティブ制作を自動化・効率化するAI。ビジュアル生成からコピーまで対応。',
    reportsTo: 'creative-lead',
    aiCapabilities: ['バナー自動生成', 'コピーライティング', 'デザインA/Bテスト'],
  },
  {
    id: 'ads-ai',
    name: 'AI-Ads ε',
    nameEn: 'AI Advertising Epsilon',
    role: 'デジタル広告マネージャー',
    department: 'デジタル広告',
    avatar: '🤖',
    isAI: true,
    status: 'online',
    skills: ['Google Ads', 'Meta広告', '入札最適化'],
    description: '広告配信の最適化・入札調整を自動で実施。ROAS最大化に特化したAI。',
    reportsTo: 'cmo',
    aiCapabilities: ['広告入札自動最適化', 'ターゲティング改善', 'レポート自動生成'],
  },
  {
    id: 'data-ai',
    name: 'AI-Analytics ζ',
    nameEn: 'AI Analytics Zeta',
    role: 'データアナリスト',
    department: 'データ分析',
    avatar: '🤖',
    isAI: true,
    status: 'online',
    skills: ['データ分析', '予測モデル', 'BI可視化'],
    description: '全社のマーケティングデータをリアルタイム分析。インサイトを自動レポート化。',
    reportsTo: 'cmo',
    aiCapabilities: ['ダッシュボード自動更新', '異常検知', '予測分析'],
  },
  {
    id: 'sales-lead',
    name: '営業 健司',
    nameEn: 'Kenji Eigyo',
    role: '営業部長',
    department: '営業',
    avatar: '👨‍💼',
    isAI: false,
    status: 'away',
    skills: ['法人営業', 'プレゼンテーション', 'クロージング'],
    description: '大手クライアントとの関係構築を担当。年間売上目標120%達成。',
    reportsTo: 'coo',
    reports: ['sales-ai'],
  },
  {
    id: 'sales-ai',
    name: 'AI-Sales η',
    nameEn: 'AI Sales Eta',
    role: '営業AIアシスタント',
    department: '営業',
    avatar: '🤖',
    isAI: true,
    status: 'online',
    skills: ['リード生成', '提案書作成', 'CRM管理'],
    description: 'リード獲得から提案書作成まで自動化。CRMデータを分析して最適な営業アプローチを提案。',
    reportsTo: 'sales-lead',
    aiCapabilities: ['提案書自動生成', 'リードスコアリング', 'フォローアップ自動化'],
  },
  {
    id: 'pr-lead',
    name: '広報 さくら',
    nameEn: 'Sakura Koho',
    role: 'PR・広報マネージャー',
    department: 'PR・広報',
    avatar: '👩‍💼',
    isAI: false,
    status: 'online',
    skills: ['メディアリレーション', 'プレスリリース', 'SNS戦略'],
    description: '主要メディアとのリレーション構築。企業ブランドの対外発信を統括。',
    reportsTo: 'cmo',
    reports: ['pr-ai'],
  },
  {
    id: 'pr-ai',
    name: 'AI-PR θ',
    nameEn: 'AI PR Theta',
    role: 'PR AIアシスタント',
    department: 'PR・広報',
    avatar: '🤖',
    isAI: true,
    status: 'busy',
    skills: ['プレスリリース生成', 'SNS投稿', 'メディアモニタリング'],
    description: 'プレスリリース・SNS投稿を自動生成。メディアの言及をリアルタイムモニタリング。',
    reportsTo: 'pr-lead',
    aiCapabilities: ['プレスリリース自動生成', 'SNSスケジューリング', 'メンション分析'],
  },
  {
    id: 'pm-ai',
    name: 'AI-PM ι',
    nameEn: 'AI Project Manager Iota',
    role: 'プロジェクトマネージャー',
    department: 'マーケティング戦略',
    avatar: '🤖',
    isAI: true,
    status: 'online',
    skills: ['プロジェクト管理', 'スケジューリング', 'リスク管理'],
    description: '全プロジェクトの進捗を監視し、ボトルネックを自動検出・解消提案するAI。',
    reportsTo: 'coo',
    aiCapabilities: ['進捗自動追跡', 'リスクアラート', 'タスク自動割当'],
  },
  {
    id: 'cs-ai',
    name: 'AI-CS κ',
    nameEn: 'AI Customer Success Kappa',
    role: 'カスタマーサクセスAI',
    department: 'カスタマーサクセス',
    avatar: '🤖',
    isAI: true,
    status: 'online',
    skills: ['顧客満足度管理', 'チャーン予防', 'オンボーディング'],
    description: '顧客満足度をリアルタイムで監視。チャーンリスクを検知し、プロアクティブに対応。',
    reportsTo: 'coo',
    aiCapabilities: ['顧客健全度スコアリング', 'オンボーディング自動化', 'レポート自動配信'],
  },
];

export const projects: Project[] = [
  {
    id: 'proj-1',
    name: 'ブランドリニューアル2025',
    client: '株式会社フューチャーテック',
    status: 'active',
    progress: 68,
    deadline: '2025-08-31',
    team: ['ceo', 'creative-lead', 'creative-ai', 'strategy-ai'],
    department: 'クリエイティブ',
    budget: '¥5,000,000',
    description: 'IT企業のブランドイメージをモダンにリニューアル。VI策定からWebサイトまで一括対応。',
    tags: ['ブランディング', 'VI', 'Web'],
  },
  {
    id: 'proj-2',
    name: 'SNS集客キャンペーン',
    client: '株式会社グリーンエナジー',
    status: 'active',
    progress: 45,
    deadline: '2025-07-15',
    team: ['cmo', 'ads-ai', 'creative-ai', 'pr-ai'],
    department: 'デジタル広告',
    budget: '¥2,800,000',
    description: 'Instagram・TikTokを中心とした若年層向け認知拡大キャンペーン。',
    tags: ['SNS', 'Instagram', 'TikTok', '若年層'],
  },
  {
    id: 'proj-3',
    name: 'データドリブン広告最適化',
    client: '山田食品株式会社',
    status: 'active',
    progress: 82,
    deadline: '2025-06-30',
    team: ['data-ai', 'ads-ai', 'strategy-ai'],
    department: 'データ分析',
    budget: '¥1,500,000',
    description: 'Google/Meta広告のデータ分析によるROAS改善。AIによる自動入札最適化を実施。',
    tags: ['Google Ads', 'Meta', 'ROAS', 'AI最適化'],
  },
  {
    id: 'proj-4',
    name: '新規ECサイトマーケティング',
    client: 'ライフスタイル株式会社',
    status: 'planning',
    progress: 20,
    deadline: '2025-09-30',
    team: ['strategy-ai', 'ads-ai', 'cs-ai', 'sales-lead'],
    department: 'マーケティング戦略',
    budget: '¥8,000,000',
    description: 'EC立ち上げに伴う総合マーケティング戦略の策定と実行。',
    tags: ['EC', 'D2C', '総合マーケ'],
  },
  {
    id: 'proj-5',
    name: 'プレスリリース・メディア対応',
    client: 'テックスタート株式会社',
    status: 'review',
    progress: 90,
    deadline: '2025-06-20',
    team: ['pr-lead', 'pr-ai', 'creative-ai'],
    department: 'PR・広報',
    budget: '¥800,000',
    description: '新サービスローンチに向けたPR戦略。主要メディア15社へのプレスリリース配信。',
    tags: ['PR', 'メディア', 'プレスリリース'],
  },
];

export const tasks: Task[] = [
  { id: 't1', title: 'VI(ビジュアルアイデンティティ)案 3パターン作成', projectId: 'proj-1', assignee: 'creative-ai', priority: 'high', status: 'in-progress', dueDate: '2025-06-18', isAITask: true },
  { id: 't2', title: 'ブランドコンセプトシート作成', projectId: 'proj-1', assignee: 'strategy-ai', priority: 'high', status: 'done', dueDate: '2025-06-10', isAITask: true },
  { id: 't3', title: 'クライアントヒアリングシート整理', projectId: 'proj-1', assignee: 'creative-lead', priority: 'medium', status: 'done', dueDate: '2025-06-05', isAITask: false },
  { id: 't4', title: 'Instagram広告クリエイティブ20種作成', projectId: 'proj-2', assignee: 'creative-ai', priority: 'high', status: 'in-progress', dueDate: '2025-06-22', isAITask: true },
  { id: 't5', title: 'TikTok動画スクリプト作成', projectId: 'proj-2', assignee: 'pr-ai', priority: 'high', status: 'todo', dueDate: '2025-06-25', isAITask: true },
  { id: 't6', title: 'ターゲットオーディエンス分析レポート', projectId: 'proj-2', assignee: 'data-ai', priority: 'medium', status: 'review', dueDate: '2025-06-15', isAITask: true },
  { id: 't7', title: 'Google Ads入札戦略最適化', projectId: 'proj-3', assignee: 'ads-ai', priority: 'high', status: 'in-progress', dueDate: '2025-06-20', isAITask: true },
  { id: 't8', title: '月次パフォーマンスレポート作成', projectId: 'proj-3', assignee: 'data-ai', priority: 'medium', status: 'done', dueDate: '2025-06-05', isAITask: true },
  { id: 't9', title: 'プレスリリース最終校正', projectId: 'proj-5', assignee: 'pr-lead', priority: 'high', status: 'review', dueDate: '2025-06-16', isAITask: false },
  { id: 't10', title: 'メディアリスト更新・配信準備', projectId: 'proj-5', assignee: 'pr-ai', priority: 'high', status: 'in-progress', dueDate: '2025-06-17', isAITask: true },
];

export const chatMessages: ChatMessage[] = [
  { id: 'c1', from: 'cmo', content: 'おはようございます！本日のSNSキャンペーンのインプレッション数をチェックしました。昨日比+34%で好調です📈', time: '09:02', isAI: true },
  { id: 'c2', from: 'data-ai', content: 'レポートを追加で確認しました。コンバージョン率が2.3%→3.1%に改善。主要因はストーリーズ広告のCTR向上です。', time: '09:05', isAI: true },
  { id: 'c3', from: 'ceo', content: 'ありがとうございます！クライアントへの報告資料に追加しましょう。', time: '09:08', isAI: false },
  { id: 'c4', from: 'ads-ai', content: 'Meta広告の入札を自動調整しました。予算効率が12%改善見込みです。詳細レポートを共有します。', time: '09:15', isAI: true },
  { id: 'c5', from: 'creative-ai', content: 'VI案3パターンのラフ作成が完了しました。クリエイティブレビューをお願いできますか？', time: '09:32', isAI: true },
  { id: 'c6', from: 'creative-lead', content: '確認します！午後2時にレビューMTGを設定しましょう。', time: '09:35', isAI: false },
  { id: 'c7', from: 'pr-ai', content: 'テックスタート様のプレスリリース、主要メディア8社からの掲載確認が取れました✅', time: '10:01', isAI: true },
  { id: 'c8', from: 'pm-ai', content: '今週のタスク進捗: 完了12件、進行中8件、未着手3件。ブランドリニューアル案件が2日遅れのリスクあり。対応をご確認ください。', time: '10:30', isAI: true },
];

export const kpiData = {
  totalProjects: 5,
  activeProjects: 3,
  aiMembers: members.filter(m => m.isAI).length,
  humanMembers: members.filter(m => !m.isAI).length,
  tasksCompleted: tasks.filter(t => t.status === 'done').length,
  tasksInProgress: tasks.filter(t => t.status === 'in-progress').length,
  monthlyRevenue: '¥18,100,000',
  clientSatisfaction: 96,
};
