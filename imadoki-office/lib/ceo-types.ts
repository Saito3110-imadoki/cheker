export interface MonthlyPL {
  month: string;
  revenue: number;          // 売上高
  cogs: number;             // 外注費・制作費（原価）
  grossProfit: number;      // 粗利（自動計算）
  personnelCost: number;    // 人件費
  adCost: number;           // 広告宣伝費
  officeCost: number;       // 家賃・オフィス費
  otherCost: number;        // その他経費
  sgaExpenses: number;      // 販管費合計（自動計算）
  operatingProfit: number;  // 営業利益（自動計算）
  notes: string;
}

export interface Client {
  id: string;
  name: string;
  monthlyFee: number;
  services: string[];
  startDate: string;
  status: 'active' | 'at-risk' | 'churned' | 'negotiating';
  notes: string;
}

export interface ActionItem {
  id: string;
  category: 'sales' | 'marketing' | 'hiring' | 'finance' | 'operations';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: string;
  deadline: string;
  status: 'pending' | 'approved' | 'rejected' | 'done';
  approvedAt?: string;
  rejectedReason?: string;
}

export interface ClientMonthlyRevenue {
  month: string;
  revenue: number;
  cogs: number;
}

export interface ClientRevenue {
  clientName: string;
  businessUnit: 'web' | 'ads' | 'sns' | 'media';
  monthly: ClientMonthlyRevenue[];
  totalRevenue: number;
  totalCogs: number;
}

export interface CompanyData {
  monthlyPL: MonthlyPL[];
  clients: Client[];
  actionItems: ActionItem[];
  clientRevenue?: ClientRevenue[];
  lastAnalyzedAt?: string;
}
