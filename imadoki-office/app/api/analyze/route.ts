import Anthropic from '@anthropic-ai/sdk';
import { CompanyData } from '@/lib/ceo-types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const data: CompanyData = await request.json();

    const { monthlyPL, clients } = data;

    const latestPL = monthlyPL[monthlyPL.length - 1];
    const prevPL = monthlyPL[monthlyPL.length - 2];

    const totalRevenue = monthlyPL.reduce((s, m) => s + m.revenue, 0);
    const activeClients = clients.filter(c => c.status === 'active');
    const atRiskClients = clients.filter(c => c.status === 'at-risk');

    const plSummary = monthlyPL.map(m =>
      `${m.month}: 売上¥${m.revenue.toLocaleString()} 原価¥${m.cogs.toLocaleString()} 販管費¥${m.sgaExpenses.toLocaleString()} 営業利益¥${m.operatingProfit.toLocaleString()}${m.notes ? ` (${m.notes})` : ''}`
    ).join('\n');

    const clientSummary = clients.map(c =>
      `${c.name}: 月額¥${c.monthlyFee.toLocaleString()} [${c.services.join('/')}] ステータス:${c.status}${c.notes ? ` (${c.notes})` : ''}`
    ).join('\n');

    const prompt = `
あなたはIMADOKI株式会社（ベンチャーマーケティング会社）の経営アドバイザーAIです。
以下の実際の経営データを分析して、社長への提言をJSON形式で返してください。

【月次P&L実績】
${plSummary || 'データなし'}

【クライアント一覧】
${clientSummary || 'データなし'}

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

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

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
