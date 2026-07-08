import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { challenge } = await request.json();

    const prompt = `あなたはIMADOKI株式会社（ベンチャーマーケティング会社）のAI採用コンサルタントです。
社長から以下の悩みや課題が共有されました：

「${challenge}」

この課題を解決するのに最適なAIエージェント（またはユニークな人材）を1名提案してください。
有名人・架空キャラ・ユーモアある人材もOKです。創造的に提案してください。

以下のJSON形式のみで返してください（他のテキスト不要）：
{
  "name": "メンバー名（例：AI-Growth θ、イーロン・マスク風AIなど）",
  "nameEn": "英語名",
  "role": "役職（20文字以内）",
  "department": "部署（経営/マーケティング戦略/クリエイティブ/デジタル広告/データ分析/営業/PR・広報/カスタマーサクセスのいずれか）",
  "avatar": "絵文字1つ（その人物/AIを表す）",
  "isAI": true,
  "description": "このメンバーの特徴・できること（50文字以内）",
  "skills": ["スキル1", "スキル2", "スキル3"],
  "aiCapabilities": ["機能1", "機能2", "機能3"],
  "recruitReason": "なぜこの人材が課題解決に最適か（ユーモアを交えて、60文字以内）"
}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 800,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') throw new Error('No text response');

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    return Response.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(message, { status: 500 });
  }
}
