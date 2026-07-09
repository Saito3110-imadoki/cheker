import { read, utils } from 'xlsx';

// Aliases for P&L column auto-detection
const PL_ALIASES: Record<string, string[]> = {
  month:        ['月', '年月', '対象月', '月次', '期間', '年月日', 'month', '日付', '計上月'],
  revenue:      ['売上', '売上高', '売上金額', '収入', '営業収益', 'revenue', '売上げ', '受注金額', '請求金額'],
  cogs:         ['外注費', '売上原価', '原価', '制作費', '仕入', '仕入高', 'cogs', '外注', '協力費'],
  personnelCost:['人件費', '給与', '役員報酬', '給与手当', '給料', '人的コスト', 'personnel'],
  adCost:       ['広告費', '広告宣伝費', '広告', '宣伝費', '販促費', 'ad', '広告費用', 'マーケ費'],
  officeCost:   ['家賃', '地代家賃', 'オフィス費', '賃借料', 'office', '家賃・光熱費', '地代'],
  otherCost:    ['その他経費', '雑費', 'その他', '経費', '諸費用', 'other', '消耗品費', '雑費用'],
  notes:        ['備考', 'メモ', '特記', 'notes', 'note', 'コメント', '摘要'],
};

// Aliases for Client column auto-detection
const CLIENT_ALIASES: Record<string, string[]> = {
  name:        ['クライアント名', '会社名', '取引先', '顧客名', 'name', 'client', '得意先名', '企業名', '会社名(個人名)', '会社名・個人名'],
  monthlyFee:  ['月額', '月額料金', '月次料金', '月額費用', '請求金額', 'fee', '月額単価', '契約金額', '売値', '売値(税込)', 'クライアントの支払総額', '税込金額', '支払総額'],
  services:    ['サービス', '対応サービス', 'service', '業務内容', 'サービス種別', '種類', 'サービス名'],
  startDate:   ['開始日', '契約開始', '開始月', '契約日', 'start', '開始', '月額費用支払い開始月日'],
  status:      ['ステータス', '状態', 'status', '契約状態', '着金チェック'],
  notes:       ['備考', 'メモ', 'notes', '特記事項', 'コメント'],
};

// Map Japanese status labels to internal keys
const STATUS_MAP: Record<string, string> = {
  '契約中': 'active', 'active': 'active',
  'リスクあり': 'at-risk', 'at-risk': 'at-risk', 'atrisk': 'at-risk',
  '解約': 'churned', 'churned': 'churned',
  '交渉中': 'negotiating', 'negotiating': 'negotiating',
};

function detectColumnMap(headers: string[], aliases: Record<string, string[]>): Record<string, number> {
  const map: Record<string, number> = {};
  const normalizeH = (h: string) => h.replace(/\s/g, '').toLowerCase();

  headers.forEach((header, idx) => {
    const hn = normalizeH(header);
    for (const [field, aliasList] of Object.entries(aliases)) {
      if (field in map) continue;
      if (aliasList.some(a => normalizeH(a) === hn || hn.includes(normalizeH(a)))) {
        map[field] = idx;
      }
    }
  });
  return map;
}

function parseRows(rows: (string | number | null)[][], headers: string[], type: 'pl' | 'clients', is1904 = false) {
  const aliases = type === 'pl' ? PL_ALIASES : CLIENT_ALIASES;
  const colMap = detectColumnMap(headers, aliases);

  const get = (row: (string | number | null)[], field: string): string => {
    const idx = colMap[field];
    if (idx == null) return '';
    const val = row[idx];
    return val != null ? String(val).trim() : '';
  };

  const dataRows = rows.filter(row => row.some(cell => cell != null && cell !== ''));

  if (type === 'pl') {
    return dataRows.map(row => {
      const monthRaw = get(row, 'month');
      // Normalize month: accepts YYYY/MM, YYYY-MM, YYYY年MM月, serial number
      let month = monthRaw;
      if (/^\d{5,}$/.test(monthRaw)) {
        // Excel serial date — use is1904 flag passed from caller
        const offset = is1904 ? 24107 : 25569;
        const date = new Date((Number(monthRaw) - offset) * 86400 * 1000);
        month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        month = monthRaw
          .replace(/年/g, '-').replace(/月/g, '').replace(/\//g, '-')
          .replace(/(\d{4})-(\d{1})$/, '$1-0$2');
        if (/^\d{4}-\d{1,2}$/.test(month)) {
          const [y, m] = month.split('-');
          month = `${y}-${m.padStart(2, '0')}`;
        }
      }
      return {
        month,
        revenue:       Number(get(row, 'revenue').replace(/,/g, '')) || 0,
        cogs:          Number(get(row, 'cogs').replace(/,/g, '')) || 0,
        personnelCost: Number(get(row, 'personnelCost').replace(/,/g, '')) || 0,
        adCost:        Number(get(row, 'adCost').replace(/,/g, '')) || 0,
        officeCost:    Number(get(row, 'officeCost').replace(/,/g, '')) || 0,
        otherCost:     Number(get(row, 'otherCost').replace(/,/g, '')) || 0,
        notes:         get(row, 'notes'),
      };
    }).filter(r => r.month && (r.revenue > 0 || r.cogs > 0));
  } else {
    return dataRows.map((row, i) => ({
      id: `c-import-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name:       get(row, 'name'),
      monthlyFee: Number(get(row, 'monthlyFee').replace(/[¥,\s]/g, '')) || 0,
      services:   get(row, 'services').split(/[/・,、]/).map(s => s.trim()).filter(Boolean),
      startDate:  (() => {
        const raw = get(row, 'startDate').replace(/\//g, '-').replace(/年/g, '-').replace(/月/g, '').replace(/日/g, '').trim();
        const [y, m] = raw.split('-');
        return y && m ? `${y}-${m.padStart(2, '0')}` : raw;
      })(),
      status:     STATUS_MAP[get(row, 'status').trim()] ?? 'active',
      notes:      get(row, 'notes'),
    })).filter(r => r.name);
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File;
    const type = form.get('type') as 'pl' | 'clients';

    if (!file) return new Response('No file', { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024) {
      return Response.json({ error: 'ファイルサイズが10MBを超えています' }, { status: 400 });
    }
    // CSV files must be parsed as UTF-8 string to avoid mojibake.
    // Excel binary formats (xls/xlsx) need buffer mode.
    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
    const workbook = isCsv
      ? read(buffer.toString('utf8'), { type: 'string', cellDates: false })
      : read(buffer, { type: 'buffer', cellDates: false });
    const is1904 = !!(workbook.Workbook?.WBProps as Record<string, unknown> | undefined)?.date1904;
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to array of arrays
    const rawData: (string | number | null)[][] = utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    if (rawData.length < 2) {
      return Response.json({ error: 'データ行が見つかりません', rows: [], headers: [], colMap: {} }, { status: 400 });
    }

    // Find the header row: the row (in the first 15) with the most non-null cells.
    // This avoids picking summary rows that appear before the real column headers.
    let headerRowIdx = 0;
    let bestCount = 0;
    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      const nonNull = rawData[i].filter(c => c != null && c !== '').length;
      if (nonNull > bestCount) { bestCount = nonNull; headerRowIdx = i; }
    }

    const headers = rawData[headerRowIdx].map(h => (h != null ? String(h).replace(/\n/g, '') : ''));
    let dataRows = rawData.slice(headerRowIdx + 1);
    // For client imports: if first column looks like a TRUE/FALSE flag (e.g. PL column),
    // filter out rows where it is explicitly FALSE.
    if (type === 'clients') {
      const firstColVals = dataRows.map(r => String(r[0] ?? '').toUpperCase().trim());
      const hasBoolFlag = firstColVals.some(v => v === 'TRUE' || v === 'FALSE');
      if (hasBoolFlag) {
        dataRows = dataRows.filter(r => {
          const v = String(r[0] ?? '').toUpperCase().trim();
          return v !== 'FALSE';
        });
      }
    }

    const aliases = type === 'pl' ? PL_ALIASES : CLIENT_ALIASES;
    const colMap = detectColumnMap(headers, aliases);
    const parsed = parseRows(dataRows, headers, type, is1904);

    return Response.json({
      headers,
      colMap,
      preview: parsed.slice(0, 5),
      total: parsed.length,
      rows: parsed,
      rawRows: dataRows.slice(0, 500), // cap at 500 rows for JSON size
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
