import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { content, docType } = await req.json();
    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

    const docLabel =
      docType === 'invoice' ? '請求書' :
      docType === 'contractor' ? '業務委託請求書' :
      docType === 'contract' ? '業務委託契約書' : '文書';

    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      messages: [
        {
          role: 'user',
          content: `あなたは日本法に精通した法務・契約の専門家です。以下の${docLabel}をリーガルチェックしてください。

【チェック観点】
1. 法的有効性・必須記載事項の確認
2. 不利な条項・リスク箇所の指摘
3. 修正推奨事項（具体的な文言例を含む）
4. 総合評価（✅安全 / ⚠️要注意 / ❌要修正）

【${docLabel}内容】
${content}

マークダウン形式で、日本語で回答してください。`,
        },
      ],
    });

    const response = await stream.finalMessage();
    const textContent = response.content.find(b => b.type === 'text');
    const result = textContent?.text ?? '';

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
