import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { projectType, clientName, brief, urls, requirements } = await request.json();

  const prompt = `あなたはIMADOKI株式会社のAIプロジェクトマネージャーです。
以下の案件情報を分析し、プロジェクト計画と、社長への確認事項をJSON形式で返してください。

【案件情報】
- クライアント: ${clientName}
- 案件種別: ${projectType}
- 概要・要件: ${brief || 'なし'}
- 参考URL: ${urls?.join(', ') || 'なし'}
- 追加要件: ${requirements || 'なし'}

以下のJSON形式のみで返してください：
{
  "projectSummary": "案件の本質を3行で要約",
  "targetAudience": "ターゲット像（具体的に）",
  "keyObjectives": ["目標1", "目標2", "目標3"],
  "suggestedTeam": [
    {"role": "担当役割", "memberType": "AI担当名", "task": "具体的なタスク"}
  ],
  "clarificationQuestions": [
    {"question": "社長への確認質問（抽象的な部分を具体化するため）", "why": "なぜこの質問が必要か"}
  ],
  "deliverables": [
    {"type": "成果物タイプ", "description": "内容説明", "category": "strategy/copy/sns/design/video"}
  ],
  "timeline": "推奨スケジュール（例：2週間）",
  "kickoffMessage": "AIチームからの一言（やる気のあるメッセージ）"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find(c => c.type === 'text');
    if (!text || text.type !== 'text') throw new Error('No text');
    const match = text.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    return Response.json(JSON.parse(match[0]));
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
}
