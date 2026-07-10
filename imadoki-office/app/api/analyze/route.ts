import Anthropic from '@anthropic-ai/sdk';
import { CompanyData } from '@/lib/ceo-types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface InvoiceLite {
  docType: string;
  status: string;
  clientName: string;
  total: number;
  dueDate?: string;
}

export async function POST(request: Request) {
  try {
    const data: CompanyData & { invoices?: InvoiceLite[] } = await request.json();

    const { monthlyPL, clients, clientRevenue, invoices } = data;

    const plSummary = monthlyPL.map(m =>
      `${m.month}: 売上¥${m.revenue.toLocaleString()} 外注費¥${m.cogs.toLocaleString()} 粗利¥${m.grossProfit.toLocaleString()}(${m.revenue > 0 ? Math.round(m.grossProfit/m.revenue*100) : 0}%) 人件費¥${(m.personnelCost||0).toLocaleString()} 広告費¥${(m.adCost||0).toLocaleString()} 家賃等¥${((m.officeCost||0)+(m.otherCost||0)).toLocaleString()} 営業利益¥${m.operatingProfit.toLocaleString()}(${m.revenue > 0 ? Math.round(m.operatingProfit/m.revenue*100) : 0}%)${m.notes ? ` (${m.notes})` : ''}`
    ).join('\n');

    const clientSummary = clients.map(c =>
      `${c.name}: 月額¥${c.monthlyFee.toLocaleString()} [${c.services.join('/')}] ステータス:${c.status}${c.notes ? ` (${c.notes})` : ''}`
    ).join('\n');

    // Excel取込のクライアント別実績（最も信頼できる実データ）
    const buLabel: Record<string, string> = { web: 'Web事業部', ads: '広告事業部', sns: 'SNS運用事業部', media: 'メディア事業部' };
    const revSummary = (clientRevenue ?? [])
      .slice()
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map(c => {
        const gp = c.totalRevenue - c.totalCogs;
        const rate = c.totalRevenue > 0 ? Math.round((gp / c.totalRevenue) * 100) : 0;
        return `${c.clientName} [${buLabel[c.businessUnit] ?? c.businessUnit}]: 売上¥${c.totalRevenue.toLocaleString()} 原価¥${c.totalCogs.toLocaleString()} 粗利率${c.totalCogs > 0 ? `${rate}%` : '不明(原価未入力)'}`;
      }).join('\n');

    // 請求書の状況（未回収リスク）
    const today = new Date().toISOString().slice(0, 10);
    const invSummary = (invoices ?? [])
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .map(i => `${i.clientName}: ¥${i.total.toLocaleString()} 期日${i.dueDate || '未設定'}${i.dueDate && i.dueDate < today ? ' ⚠️期限超過' : ''}`)
      .join('\n');

    const prompt = `
あなたはIMADOKI株式会社（ベンチャーマーケティング会社）の経営アドバイザーAIです。
以下の実際の経営データを分析して、社長への提言をJSON形式で返してください。

【月次P&L実績】
${plSummary || 'データなし'}

【クライアント別売上実績（Excel PLから取込・事業部別）】
${revSummary || 'データなし'}

【クライアント一覧（契約管理）】
${clientSummary || 'データなし'}

【未回収の請求書】
${invSummary || 'なし'}

【分析してほしいこと】
1. 収益性分析（粗利率・営業利益率・トレンド）
2. クライアントリスク分析（集中度・解約リスク）
3. 成長機会の特定
4. 優先度の高いネクストアクション（具体的に5つ）

以下のJSON形式で返してください（他のテキストは不要）：
{
  "summary": "3行以内の経営状況サマリー",
  "metrics": {
    "grossMargin": 粗利率（数値のみ、%なし）,
    "operatingMargin": 営業利益率（数値のみ）,
    "revenueGrowth": 直近月の売上成長率（数値のみ、前月比）,
    "clientConcentration": "最大クライアントの売上比率（テキスト）",
    "riskLevel": "low/medium/high"
  },
  "insights": [
    {"type": "positive/negative/warning", "text": "インサイト内容"}
  ],
  "actions": [
    {
      "category": "sales/marketing/hiring/finance/operations",
      "title": "アクションタイトル（20文字以内）",
      "description": "具体的な実行内容",
      "priority": "high/medium/low",
      "expectedImpact": "期待される効果",
      "deadline": "推奨期限（例：今月中/来月末/3ヶ月以内）"
    }
  ]
}`;

    // 実データ量が多いと思考トークンだけでmax_tokensを使い切るため、余裕を持たせてストリーミングで取得
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });
    const response = await stream.finalMessage();

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const result = JSON.parse(jsonMatch[0]);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(message, { status: 500 });
  }
}
