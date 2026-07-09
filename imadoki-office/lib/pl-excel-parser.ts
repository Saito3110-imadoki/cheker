import type { MonthlyPL, ClientRevenue, ClientMonthlyRevenue } from '@/lib/ceo-types';

export type Row = (string | number | null | undefined)[];

function serialToYYYYMM(serial: number): string {
  const date = new Date((serial - 25569) * 86400 * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Excel date serials for ~2009–2064 range
function findDateColumns(row: Row): { idx: number; month: string }[] {
  const result: { idx: number; month: string }[] = [];
  row.forEach((cell, idx) => {
    if (typeof cell === 'number' && cell > 40000 && cell < 60000) {
      result.push({ idx, month: serialToYYYYMM(cell) });
    }
  });
  return result;
}

function findHeaderDates(raw: Row[]): { dateColumns: { idx: number; month: string }[]; headerRowIdx: number } {
  let dateColumns: { idx: number; month: string }[] = [];
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(6, raw.length); r++) {
    if (!raw[r]) continue;
    const cols = findDateColumns(raw[r]);
    if (cols.length > dateColumns.length) {
      dateColumns = cols;
      headerRowIdx = r;
    }
  }
  return { dateColumns, headerRowIdx };
}

// Read a numeric value at idx; if the cell is "-" (padding), fall back to idx+1.
// 売上 values sit on the serial column, 原価 values are shifted one to the right.
function readShifted(row: Row, idx: number): number {
  if (typeof row[idx] === 'number') return row[idx] as number;
  if (typeof row[idx + 1] === 'number') return row[idx + 1] as number;
  return 0;
}

export function parsePLOverall(raw: Row[]): MonthlyPL[] {
  const { dateColumns, headerRowIdx } = findHeaderDates(raw);
  if (dateColumns.length === 0) return [];

  let revenueRow: Row | null = null;
  let cogsRow: Row | null = null;
  let sgaRow: Row | null = null;
  let currentCategory = '';

  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;
    const c0 = row[0];
    if (c0 === '売上' || c0 === '原価' || c0 === '販管費' || c0 === '粗利益' || c0 === '営業利益') {
      currentCategory = c0 as string;
    }
    if (row[1] === '合計' || row[0] === '合計') {
      if (currentCategory === '売上' && !revenueRow) revenueRow = row;
      else if (currentCategory === '原価' && !cogsRow) cogsRow = row;
      else if (currentCategory === '販管費' && !sgaRow) sgaRow = row;
    }
    if (revenueRow && cogsRow && sgaRow) break;
  }

  return dateColumns
    .map(({ idx, month }) => {
      const revenue = typeof revenueRow?.[idx] === 'number' ? (revenueRow[idx] as number) : 0;
      const cogs = typeof cogsRow?.[idx] === 'number' ? (cogsRow[idx] as number) : 0;
      const sga = typeof sgaRow?.[idx] === 'number' ? (sgaRow[idx] as number) : 0;
      return {
        month,
        revenue,
        cogs,
        grossProfit: revenue - cogs,
        personnelCost: 0,
        adCost: 0,
        officeCost: 0,
        otherCost: sga,
        sgaExpenses: sga,
        operatingProfit: revenue - cogs - sga,
        notes: '',
      } satisfies MonthlyPL;
    })
    .filter(pl => pl.revenue !== 0 || pl.cogs !== 0);
}

export function parseClientSheet(raw: Row[], businessUnit: ClientRevenue['businessUnit']): ClientRevenue[] {
  const { dateColumns, headerRowIdx } = findHeaderDates(raw);
  if (dateColumns.length === 0) return [];

  const months = dateColumns.map(d => d.month);
  const clients: ClientRevenue[] = [];
  let currentClientName: string | null = null;
  let currentCategory = '';
  let monthlyMap: Record<string, ClientMonthlyRevenue> = {};

  const resetMap = () => {
    monthlyMap = {};
    months.forEach(m => { monthlyMap[m] = { month: m, revenue: 0, cogs: 0 }; });
  };

  const pushClient = () => {
    if (!currentClientName) return;
    const monthly = months.map(m => monthlyMap[m] ?? { month: m, revenue: 0, cogs: 0 });
    const totalRevenue = monthly.reduce((s, x) => s + x.revenue, 0);
    const totalCogs = monthly.reduce((s, x) => s + x.cogs, 0);
    if (totalRevenue > 0 || totalCogs > 0) {
      clients.push({ clientName: currentClientName, businessUnit, monthly, totalRevenue, totalCogs });
    }
  };

  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;

    // New client block: col0 is a non-empty string that isn't a header keyword.
    // The same row also carries the category in col1 (e.g. ["UNI'SON","売上","Web制作費",...]).
    const col0 = row[0];
    if (typeof col0 === 'string' && col0.trim() !== '' &&
        !['クライアント名', '売上', '原価', '合計'].includes(col0.trim())) {
      pushClient();
      currentClientName = col0.replace(/\n/g, ' ').trim();
      currentCategory = '';
      resetMap();
      // fall through — this row may also set the category below
    }

    // Category marker lives in col1 ("売上" / "原価").
    // Sheet-level "売上合計"/"原価合計" rows don't match and are correctly skipped.
    if (row[1] === '売上') currentCategory = '売上';
    else if (row[1] === '原価') currentCategory = '原価';

    // Per-category totals row: col2 === '合計'
    if (row[2] === '合計' && currentClientName && currentCategory) {
      dateColumns.forEach(({ idx, month }) => {
        const val = readShifted(row, idx);
        if (!monthlyMap[month]) monthlyMap[month] = { month, revenue: 0, cogs: 0 };
        if (currentCategory === '売上') monthlyMap[month].revenue = val;
        else if (currentCategory === '原価') monthlyMap[month].cogs = val;
      });
    }
  }
  pushClient();

  return clients;
}

const BU_MAP: { keywords: string[]; unit: ClientRevenue['businessUnit'] }[] = [
  { keywords: ['Web', 'WEB', 'ウェブ'], unit: 'web' },
  { keywords: ['広告'], unit: 'ads' },
  { keywords: ['SNS'], unit: 'sns' },
  { keywords: ['メディア'], unit: 'media' },
];

export function parseWorkbook(
  sheetNames: string[],
  getSheet: (name: string) => Row[],
): { monthlyPL: MonthlyPL[]; clientRevenue: ClientRevenue[]; parsedSheets: string[] } {
  const plSheetName = sheetNames.find(n => n.includes('PL') && n.includes('全体')) ?? sheetNames[0];
  const monthlyPL = parsePLOverall(getSheet(plSheetName));

  const clientRevenue: ClientRevenue[] = [];
  const parsedSheets: string[] = [plSheetName];

  for (const sheetName of sheetNames) {
    // Only client-detail sheets ("売上・原価○○") — skip PL/販管費 sheets
    if (!sheetName.includes('売上') || !sheetName.includes('原価')) continue;
    const bu = BU_MAP.find(b => b.keywords.some(k => sheetName.includes(k)));
    if (!bu) continue;
    const rows = getSheet(sheetName);
    if (rows.length < 3) continue;
    const parsed = parseClientSheet(rows, bu.unit);
    if (parsed.length > 0) parsedSheets.push(sheetName);
    clientRevenue.push(...parsed);
  }

  return { monthlyPL, clientRevenue, parsedSheets };
}
