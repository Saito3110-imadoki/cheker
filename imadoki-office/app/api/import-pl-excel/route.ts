import { NextRequest, NextResponse } from 'next/server';
import { read, utils } from 'xlsx';
import { parseWorkbook, type Row } from '@/lib/pl-excel-parser';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = read(buf, { type: 'buffer' });

    const getSheet = (name: string): Row[] => {
      const ws = wb.Sheets[name];
      if (!ws) return [];
      return utils.sheet_to_json<Row>(ws, { header: 1, defval: null });
    };

    const { monthlyPL, clientRevenue, parsedSheets } = parseWorkbook(wb.SheetNames, getSheet);

    if (monthlyPL.length === 0 && clientRevenue.length === 0) {
      return NextResponse.json({
        error: `対応するデータが見つかりませんでした。シート構成: ${wb.SheetNames.join(', ')}`,
      }, { status: 422 });
    }

    return NextResponse.json({ monthlyPL, clientRevenue, parsedSheets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Excelの解析に失敗しました: ${msg}` }, { status: 500 });
  }
}
