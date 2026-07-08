import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const categoryPrompts: Record<string, string> = {
  sales: `あなたはIMADOKI株式会社（ベンチャーマーケティング会社）のAI営業アドバイザーです。
事業内容：マーケ支援・広告運用代行・SNS運用・WEB制作
月商：100〜200万円規模
社長に対して、営業案件・提案・クロージング判断について、具体的かつ実行可能なアドバイスをください。
判断が必要な場合は「推奨アクション」として明確に提示してください。日本語で簡潔に。`,

  marketing: `あなたはIMADOKI株式会社のAIマーケティングアドバイザーです。
主力施策：SNS広告（Instagram/TikTok/Meta）
月商：100〜200万円規模
社長に対して、SNS広告の予算配分・ROAS・クリエイティブ戦略について分析と意思決定支援をしてください。
数値を交えた具体的な提案を日本語で。`,

  hiring: `あなたはIMADOKI株式会社のAI採用アドバイザーです。
採用スタイル：タイミングで必要になる業務委託メイン
月商：100〜200万円規模のベンチャー
社長に対して、業務委託の採用判断・単価交渉・契約形態についてアドバイスをください。
コスト対効果を重視した実践的な提案を日本語で。`,

  finance: `あなたはIMADOKI株式会社のAI財務アドバイザーです。
月商：100〜200万円規模のベンチャーマーケティング会社
社長に対して、キャッシュフロー管理・投資判断・コスト最適化について分析と意思決定支援をしてください。
この規模感に合った現実的なアドバイスを日本語で。`,
};

export async function POST(request: Request) {
  try {
    const { message, category } = await request.json();

    if (!message || !category) {
      return new Response('Invalid request', { status: 400 });
    }

    const systemPrompt = categoryPrompts[category] || categoryPrompts.sales;

    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(message, { status: 500 });
  }
}
