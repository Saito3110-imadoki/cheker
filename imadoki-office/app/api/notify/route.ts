import { NextRequest, NextResponse } from 'next/server';

// Slack Incoming Webhookへの通知プロキシ（CORSの都合でサーバー経由にする）
export async function POST(req: NextRequest) {
  try {
    const { webhook, text } = await req.json();
    if (!webhook || typeof webhook !== 'string' || !webhook.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json({ error: 'Slack Webhook URLが正しくありません（https://hooks.slack.com/ で始まるURL）' }, { status: 400 });
    }
    if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Slack応答: ${res.status}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `通知に失敗しました: ${msg}` }, { status: 500 });
  }
}
