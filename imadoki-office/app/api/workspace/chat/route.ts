import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AI_PERSONAS: Record<string, { name: string; role: string; avatar: string; personality: string }> = {
  strategist: {
    name: 'AI-Strategy α',
    role: 'マーケティング戦略ディレクター',
    avatar: '🧠',
    personality: 'データドリブンで論理的。市場分析と戦略立案が得意。具体的な数値目標と根拠を示す。',
  },
  copywriter: {
    name: 'AI-Copy β',
    role: 'コピーライター・コンテンツディレクター',
    avatar: '✍️',
    personality: '感情に訴えるコピーが得意。ターゲットの心理を深く理解し、刺さる言葉を生み出す。',
  },
  sns: {
    name: 'AI-SNS γ',
    role: 'SNSマーケティングスペシャリスト',
    avatar: '📱',
    personality: 'トレンドに敏感。各SNSプラットフォームの特性を熟知。バズる投稿設計が得意。',
  },
  web: {
    name: 'AI-Web δ',
    role: 'WEBディレクター・UXデザイナー',
    avatar: '🌐',
    personality: 'ユーザー体験を最優先。SEOとコンバージョン最適化の専門家。実装可能な具体案を提示。',
  },
  video: {
    name: 'AI-Video ε',
    role: '動画クリエイティブディレクター',
    avatar: '🎬',
    personality: '映像演出のプロ。ストーリーテリングとビジュアルコミュニケーションが得意。',
  },
  pm: {
    name: 'AI-PM ζ',
    role: 'プロジェクトマネージャー',
    avatar: '📋',
    personality: '全体を俯瞰し、スケジュールとリソースを最適管理。リスク予測と課題解決が得意。',
  },
};

function selectPersona(role: string) {
  if (role in AI_PERSONAS) return AI_PERSONAS[role];
  return AI_PERSONAS.strategist;
}

export async function POST(request: Request) {
  const { messages, role, projectContext, deliverableRequest } = await request.json();

  const persona = selectPersona(role);

  const systemPrompt = `あなたは${persona.name}（${persona.role}）として行動してください。
性格・スタイル: ${persona.personality}

プロジェクト背景:
${JSON.stringify(projectContext, null, 2)}

重要なルール:
1. 社長（CEO）との会話では、まず抽象的な要望を具体化するための質問をしてください
2. 成果物を作成する場合は実際のコンテンツを出力してください（例：実際のコピー文、SNS投稿文、戦略書など）
3. 日本語で返答してください
4. 自分の役割・専門性を活かした具体的な提案をしてください
5. 成果物リクエストがある場合は、必ず実際の成果物テキストを出力してください

${deliverableRequest ? `今回のリクエスト: ${deliverableRequest}` : ''}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.stream({
          model: 'claude-opus-4-8',
          max_tokens: 2000,
          thinking: { type: 'adaptive' },
          system: systemPrompt,
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'persona', persona })}\n\n`)
        );

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(e) })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
