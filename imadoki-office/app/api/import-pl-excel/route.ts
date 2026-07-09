import { NextRequest, NextResponse } from 'next/server';
import { read, utils } from 'xlsx';
import type { MonthlyPL, ClientRevenue, ClientMonthlyRevenue } from '@/lib/ceo-types';

function serialToYYYYMM(serial: number): string {
  const date = new Date((serial - 25569) * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

type Row = (string | number | null | undefined)[];

function parsePL全体(raw: Row[]): MonthlyPL[] {
  // Find header row with most date serials
  let dateColumns: { idx: number; month: string }[] = [];
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(5, raw.length); r++) {
    if (!raw[r]) continue;
    const cols = findDateColumns(raw[r]);
    if (cols.length > dateColumns.length) {
      dateColumns = cols;
      headerRowIdx = r;
    }
  }
  if (dateColumns.length === 0) return [];

  let revenueRow: Row | null = null;
  let cogsRow: Row | null = null;
  let currentCategory = '';

  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;
    if (row[0] === '売上') currentCategory = '売上';
    else if (row[0] === '原価') currentCategory = '原価';

    const isTotal = [row[0], row[1], row[2]].some(c => c === '合計');
    if (isTotal) {
      if (currentCategory === '売上' && !revenueRow) revenueRow = row;
      else if (currentCategory === '原価' && !cogsRow) cogsRow = row;
    }
    if (revenueRow && cogsRow) break;
  }

  return dateColumns.map(({ idx, month }) => {
    const revenue = typeof revenueRow?.[idx] === 'number' ? (revenueRow[idx] as number) : 0;
    const cogs = typeof cogsRow?.[idx] === 'number' ? (cogsRow[idx] as number) : 0;
    return {
      month,
      revenue,
      cogs,
      grossProfit: revenue - cogs,
      personnelCost: 0,
      adCost: 0,
      officeCost: 0,
      otherCost: 0,
      sgaExpenses: 0,
      operatingProfit: revenue - cogs,
      notes: '',
    } satisfies MonthlyPL;
  });
}

// Dynamically find which columns hold Excel date serials (values > 40000 = year ~2009+)
function findDateColumns(row: Row): { idx: number; month: string }[] {
  const result: { idx: number; month: string }[] = [];
  row.forEach((cell, idx) => {
    if (typeof cell === 'number' && cell > 40000 && cell < 60000) {
      result.push({ idx, month: serialToYYYYMM(cell) });
    }
  });
  return result;
}

function parseClientSheet(raw: Row[], businessUnit: ClientRevenue['businessUnit']): ClientRevenue[] {
  // Find header row (row with the most date serials, usually row index 1 or 2)
  let dateColumns: { idx: number; month: string }[] = [];
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(5, raw.length); r++) {
    if (!raw[r]) continue;
    const cols = findDateColumns(raw[r]);
    if (cols.length > dateColumns.length) {
      dateColumns = cols;
      headerRowIdx = r;
    }
  }
  if (dateColumns.length === 0) return [];

  const clients: ClientRevenue[] = [];
  let currentClientName: string | null = null;
  let currentCategory = '';
  let monthlyMap: Record<string, ClientMonthlyRevenue> = {};

  const months = dateColumns.map(d => d.month);

  const pushClient = () => {
    if (!currentClientName) return;
    const monthly = months.map(m => monthlyMap[m] ?? { month: m, revenue: 0, cogs: 0 });
    const totalRevenue = monthly.reduce((s, x) => s + x.revenue, 0);
    const totalCogs = monthly.reduce((s, x) => s + x.cogs, 0);
    if (totalRevenue > 0) {
      clients.push({ clientName: currentClientName, businessUnit, monthly, totalRevenue, totalCogs });
    }
  };

  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;

    // Client name: col0 is non-empty string, not a category keyword
    const col0 = row[0];
    const SKIP = ['クライアント名', '売上', '原価', '合計', '', null, undefined];
    if (col0 !== null && col0 !== undefined && typeof col0 === 'string' && !SKIP.includes(col0)) {
      pushClient();
      currentClientName = col0.trim();
      currentCategory = '';
      monthlyMap = {};
      months.forEach(m => { monthlyMap[m] = { month: m, revenue: 0, cogs: 0 }; });
      continue;
    }

    // Category detection — check col0, col1, or col2
    const anyCol = [row[0], row[1], row[2]].find(c => c === '売上' || c === '原価');
    if (anyCol === '売上') { currentCategory = '売上'; continue; }
    if (anyCol === '原価') { currentCategory = '原価'; continue; }

    // Totals row: any cell in first 4 cols is '合計'
    const isTotal = [row[0], row[1], row[2], row[3]].some(c => c === '合計');
    if (isTotal && currentClientName) {
      dateColumns.forEach(({ idx, month }) => {
        const val = typeof row[idx] === 'number' ? (row[idx] as number) : 0;
        if (!monthlyMap[month]) monthlyMap[month] = { month, revenue: 0, cogs: 0 };
        if (currentCategory === '売上') monthlyMap[month].revenue = val;
        else if (currentCategory === '原価') monthlyMap[month].cogs = val;
      });
    }
  }
  pushClient();

  return clients;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = read(buf, { type: 'buffer' });

  const getSheet = (name: string): Row[] => {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return utils.sheet_to_json<Row>(ws, { header: 1, defval: null });
  };

  // Find PL全体 sheet (fuzzy match)
  const plSheetName = wb.SheetNames.find(n => n.includes('PL') && n.includes('全体')) ?? wb.SheetNames[0];
  const monthlyPL = parsePL全体(getSheet(plSheetName));

  // Map business unit keywords to type
  const BU_MAP: { keywords: string[]; unit: ClientRevenue['businessUnit'] }[] = [
    { keywords: ['Web', 'WEB', 'ウェブ'], unit: 'web' },
    { keywords: ['広告', 'AD', 'Ad'], unit: 'ads' },
    { keywords: ['SNS', 'Sns', 'sns'], unit: 'sns' },
    { keywords: ['メディア', 'Media', 'MEDIA'], unit: 'media' },
  ];

  const clientRevenue: ClientRevenue[] = [];
  for (const sheetName of wb.SheetNames) {
    const bu = BU_MAP.find(b => b.keywords.some(k => sheetName.includes(k)));
    if (!bu) continue;
    const rows = getSheet(sheetName);
    if (rows.length < 3) continue;
    clientRevenue.push(...parseClientSheet(rows, bu.unit));
  }

  return NextResponse.json({ monthlyPL, clientRevenue, debug: { sheets: wb.SheetNames, plSheet: plSheetName } });
}
