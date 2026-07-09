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
  const headerRow = raw[1];
  if (!headerRow) return [];

  const months: string[] = [];
  for (let i = 2; i <= 13; i++) {
    const serial = headerRow[i];
    if (typeof serial === 'number') {
      months.push(serialToYYYYMM(serial));
    }
  }

  let revenueRow: Row | null = null;
  let cogsRow: Row | null = null;
  let currentCategory = '';

  for (let r = 2; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;
    if (row[0] === '売上') currentCategory = '売上';
    else if (row[0] === '原価') currentCategory = '原価';

    if (row[1] === '合計') {
      if (currentCategory === '売上' && !revenueRow) revenueRow = row;
      else if (currentCategory === '原価' && !cogsRow) cogsRow = row;
    }
    if (revenueRow && cogsRow) break;
  }

  return months.map((month, i) => {
    const idx = i + 2;
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

const CLIENT_DATE_INDICES = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25];

function parseClientSheet(raw: Row[], businessUnit: ClientRevenue['businessUnit']): ClientRevenue[] {
  const headerRow = raw[1];
  if (!headerRow) return [];

  const months: string[] = CLIENT_DATE_INDICES.map(i => {
    const serial = headerRow[i];
    return typeof serial === 'number' ? serialToYYYYMM(serial) : '';
  });

  const clients: ClientRevenue[] = [];
  let currentClientName: string | null = null;
  let currentCategory = '';
  let monthlyMap: Record<string, ClientMonthlyRevenue> = {};

  const pushClient = () => {
    if (!currentClientName) return;
    const monthly = months.map(m => monthlyMap[m] ?? { month: m, revenue: 0, cogs: 0 });
    const totalRevenue = monthly.reduce((s, x) => s + x.revenue, 0);
    const totalCogs = monthly.reduce((s, x) => s + x.cogs, 0);
    if (totalRevenue > 0) {
      clients.push({ clientName: currentClientName, businessUnit, monthly, totalRevenue, totalCogs });
    }
  };

  for (let r = 4; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;

    const col0 = row[0];
    if (col0 !== null && col0 !== undefined && typeof col0 === 'string' && col0 !== 'クライアント名') {
      pushClient();
      currentClientName = col0;
      currentCategory = '';
      monthlyMap = {};
      months.forEach(m => { monthlyMap[m] = { month: m, revenue: 0, cogs: 0 }; });
      continue;
    }

    const col1 = row[1];
    if (col1 === '売上') { currentCategory = '売上'; continue; }
    if (col1 === '原価') { currentCategory = '原価'; continue; }

    if (row[2] === '合計' && currentClientName) {
      CLIENT_DATE_INDICES.forEach((idx, i) => {
        const month = months[i];
        if (!month) return;
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

  const monthlyPL = parsePL全体(getSheet('PL全体'));

  const clientRevenue: ClientRevenue[] = [
    ...parseClientSheet(getSheet('売上・原価Web'), 'web'),
    ...parseClientSheet(getSheet('売上・原価広告'), 'ads'),
    ...parseClientSheet(getSheet('売上・原価SNS運用'), 'sns'),
    ...parseClientSheet(getSheet('売上・原価メディア'), 'media'),
  ];

  return NextResponse.json({ monthlyPL, clientRevenue });
}
