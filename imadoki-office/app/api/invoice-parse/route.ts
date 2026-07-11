import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { read, utils } from 'xlsx';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACT_PROMPT = `この書類は請求書・業務委託請求書・契約書のいずれかです。内容を読み取り、以下のJSON形式だけを返してください（説明文は不要）。

{
  "docType": "invoice | contractor | contract",
  "clientName": "取引先名（御中・様は除く）",
  "clientAddress": "取引先住所（あれば）",
  "issueDate": "発行日 YYYY-MM-DD",
  "dueDate": "支払期日 YYYY-MM-DD（なければ空文字）",
  "items": [
    { "description": "品目・サービス名", "quantity": 数量, "unitPrice": 単価, "amount": 金額 }
  ],
  "subtotal": 小計（税抜）,
  "tax": 消費税額,
  "total": 合計（税込）,
  "notes": "振込先・備考（あれば）"
}

注意:
- docTypeは「業務委託請求書」ならcontractor、「契約書」ならcontract、それ以外の請求書はinvoice
- 金額はカンマ・¥を除いた数値
- 明細が読み取れない場合は合計金額から1行にまとめる
- 日付が和暦・スラッシュ区切りでもYYYY-MM-DDに正規化`;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
  }

  const fileName = 'name' in file ? (file as File).name.toLowerCase() : '';
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    let content: Anthropic.MessageParam['content'];

    if (fileName.endsWith('.pdf')) {
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } },
        { type: 'text', text: EXTRACT_PROMPT },
      ];
    } else if (/\.(png|jpg|jpeg|gif|webp)$/.test(fileName)) {
      const mediaType = fileName.endsWith('.png') ? 'image/png'
        : fileName.endsWith('.gif') ? 'image/gif'
        : fileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      content = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: buf.toString('base64') } },
        { type: 'text', text: EXTRACT_PROMPT },
      ];
    } else if (/\.(xlsx|xls|csv)$/.test(fileName)) {
      // Excel/CSVはテキスト化して渡す
      const wb = fileName.endsWith('.csv')
        ? read(buf.toString('utf8'), { type: 'string' })
        : read(buf, { type: 'buffer' });
      const text = wb.SheetNames.map(name =>
        `【シート: ${name}】\n${utils.sheet_to_csv(wb.Sheets[name])}`
      ).join('\n\n').slice(0, 30000);
      content = [{ type: 'text', text: `${EXTRACT_PROMPT}\n\n【書類データ】\n${text}` }];
    } else {
      return NextResponse.json({ error: '対応形式: PDF / 画像(PNG,JPG) / Excel / CSV' }, { status: 422 });
    }

    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content }],
    });
    const response = await stream.finalMessage();

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('AIから応答がありませんでした');

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('書類として読み取れませんでした');

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ invoice: parsed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `読み取りに失敗しました: ${msg}` }, { status: 500 });
  }
}
