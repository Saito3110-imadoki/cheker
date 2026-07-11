'use client';

import { useState, useEffect, useRef } from 'react';
import { CompanyData, MonthlyPL, Client, ClientRevenue } from '@/lib/ceo-types';

interface PlExcelResult {
  monthlyPL: MonthlyPL[];
  clientRevenue: ClientRevenue[];
  parsedSheets: string[];
}

const BU_LABELS: Record<string, string> = { web: 'Web', ads: '広告', sns: 'SNS運用', media: 'メディア' };

// -------- Smart Import Modal --------
const PL_FIELD_LABELS: Record<string, string> = {
  month: '月', revenue: '売上高', cogs: '外注費・制作費',
  personnelCost: '人件費', adCost: '広告費', officeCost: '家賃・オフィス費',
  otherCost: 'その他経費', notes: 'メモ',
};
const CLIENT_FIELD_LABELS: Record<string, string> = {
  name: 'クライアント名', monthlyFee: '月額', services: 'サービス',
  startDate: '開始月', status: 'ステータス', notes: 'メモ',
};

interface ImportResult {
  headers: string[];
  colMap: Record<string, number>;
  preview: Record<string, unknown>[];
  total: number;
  rows: Record<string, unknown>[];
  // raw data rows for client-side remap
  rawRows: (string | number | null)[][];
}

function SmartImportModal({
  type, onClose, onConfirm,
}: {
  type: 'pl' | 'clients';
  onClose: () => void;
  onConfirm: (rows: Record<string, unknown>[]) => void;
}) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [colMap, setColMap] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const fieldLabels = type === 'pl' ? PL_FIELD_LABELS : CLIENT_FIELD_LABELS;
  const requiredFields = type === 'pl' ? ['month', 'revenue'] : ['name', 'monthlyFee'];

  async function handleFile(file: File) {
    setLoading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    try {
      const res = await fetch('/api/import-parse', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setColMap(data.colMap);
      setStep('mapping');
    } catch (e) {
      setError('読み込み失敗: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }

  function applyColMap(rawRows: (string | number | null)[][], map: Record<string, number>) {
    const get = (row: (string | number | null)[], field: string): string => {
      const idx = map[field];
      if (idx == null || idx < 0) return '';
      const val = row[idx];
      return val != null ? String(val).trim() : '';
    };
    const dataRows = rawRows.filter(row => row.some(c => c != null && c !== ''));
    if (type === 'pl') {
      return dataRows.map(row => {
        let month = get(row, 'month');
        month = month.replace(/年/g, '-').replace(/月/g, '').replace(/\//g, '-');
        const [y, m] = month.split('-');
        if (y && m) month = `${y}-${m.padStart(2, '0')}`;
        return {
          month,
          revenue: Number(get(row, 'revenue').replace(/,/g, '')) || 0,
          cogs: Number(get(row, 'cogs').replace(/,/g, '')) || 0,
          personnelCost: Number(get(row, 'personnelCost').replace(/,/g, '')) || 0,
          adCost: Number(get(row, 'adCost').replace(/,/g, '')) || 0,
          officeCost: Number(get(row, 'officeCost').replace(/,/g, '')) || 0,
          otherCost: Number(get(row, 'otherCost').replace(/,/g, '')) || 0,
          notes: get(row, 'notes'),
        };
      }).filter(r => r.month && r.revenue > 0);
    } else {
      const STATUS_MAP: Record<string, string> = {
        '契約中': 'active', 'active': 'active',
        'リスクあり': 'at-risk', 'at-risk': 'at-risk',
        '解約': 'churned', 'churned': 'churned',
        '交渉中': 'negotiating', 'negotiating': 'negotiating',
      };
      return dataRows.map((row, i) => ({
        id: `c-import-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
        name: get(row, 'name'),
        monthlyFee: Number(get(row, 'monthlyFee').replace(/,/g, '')) || 0,
        services: get(row, 'services').split(/[/・,、]/).map(s => s.trim()).filter(Boolean),
        startDate: (() => {
          const raw = get(row, 'startDate').replace(/年/g, '-').replace(/月/g, '').replace(/\//g, '-').replace(/日/g, '').trim();
          const [y, m] = raw.split('-');
          return y && m ? `${y}-${m.padStart(2, '0')}` : raw;
        })(),
        status: STATUS_MAP[get(row, 'status').trim()] ?? 'active',
        notes: get(row, 'notes'),
      })).filter(r => r.name);
    }
  }

  function remapAndPreview() {
    if (!result) return;
    const remapped = applyColMap(result.rawRows, colMap);
    setResult(prev => prev ? {
      ...prev,
      rows: remapped,
      preview: remapped.slice(0, 5),
      total: remapped.length,
    } : prev);
    setStep('preview');
  }

  function confirm() {
    if (!result) return;
    onConfirm(result.rows);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto" style={{ background: '#0f0f1a', border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">
            📂 スマートインポート — {type === 'pl' ? 'P&L（月次損益）' : 'クライアント'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {['upload', 'mapping', 'preview'].map((s, i) => {
            const labels = ['① ファイル選択', '② カラム確認', '③ プレビュー'];
            const active = s === step;
            const done = ['upload','mapping','preview'].indexOf(s) < ['upload','mapping','preview'].indexOf(step);
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-6 h-px" style={{ background: 'rgba(99,102,241,0.3)' }} />}
                <span className="text-xs px-2.5 py-1 rounded-full" style={{
                  background: active ? 'rgba(99,102,241,0.2)' : done ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#a5b4fc' : done ? '#4ade80' : '#6b7280',
                }}>{done ? '✓ ' : ''}{labels[i]}</span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Step 1: upload */}
        {step === 'upload' && (
          <div>
            <div
              className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all hover:opacity-80"
              style={{ borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.04)' }}
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-4xl mb-3">{loading ? '⏳' : '📂'}</div>
              <div className="text-white font-medium mb-1">{loading ? '読み込み中...' : 'ファイルをクリックして選択'}</div>
              <div className="text-xs" style={{ color: '#6b7280' }}>CSV・Excel（.xlsx / .xls）対応 — どんな列名でも自動認識</div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
            <div className="mt-4 p-3 rounded-lg text-xs space-y-1" style={{ background: 'rgba(255,255,255,0.03)', color: '#6b7280' }}>
              <div className="font-medium text-white mb-1.5">自動認識できる列名の例：</div>
              {type === 'pl' ? (
                <div className="grid grid-cols-2 gap-1">
                  <div>月 / 年月 / 対象月 / 月次</div>
                  <div>売上 / 売上高 / 売上金額 / 収入</div>
                  <div>外注費 / 制作費 / 売上原価</div>
                  <div>人件費 / 給与 / 役員報酬</div>
                  <div>広告費 / 広告宣伝費 / 販促費</div>
                  <div>家賃 / 地代家賃 / 賃借料</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  <div>クライアント名 / 会社名 / 取引先</div>
                  <div>月額 / 月額料金 / 請求金額</div>
                  <div>サービス / 業務内容</div>
                  <div>開始日 / 契約開始 / 契約日</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: column mapping review */}
        {step === 'mapping' && result && (
          <div>
            <div className="mb-3 text-xs" style={{ color: '#9ca3af' }}>
              ファイルの列数: {result.headers.length} | データ行数: {result.total}
            </div>
            <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <th className="px-3 py-2 text-left text-white">取り込み項目</th>
                    <th className="px-3 py-2 text-left text-white">ファイルの列名</th>
                    <th className="px-3 py-2 text-left" style={{ color: '#6b7280' }}>認識状態</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(fieldLabels).map(([field, label]) => {
                    const idx = colMap[field];
                    const matched = idx != null;
                    const isRequired = requiredFields.includes(field);
                    return (
                      <tr key={field} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td className="px-3 py-2">
                          <span className="text-white">{label}</span>
                          {isRequired && <span className="ml-1 text-red-400">*</span>}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={idx != null ? idx : -1}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setColMap(prev => ({ ...prev, [field]: val === -1 ? undefined as unknown as number : val }));
                            }}
                            className="text-xs px-2 py-1 rounded outline-none"
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <option value={-1} style={{ background: '#0f0f1a' }}>（使用しない）</option>
                            {result.headers.map((h, i) => (
                              <option key={i} value={i} style={{ background: '#0f0f1a' }}>{h || `列${i+1}`}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {matched ? (
                            <span style={{ color: '#4ade80' }}>✓ 自動認識</span>
                          ) : (
                            <span style={{ color: isRequired ? '#f87171' : '#6b7280' }}>
                              {isRequired ? '⚠ 手動で選択' : '— 省略'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep('upload')} className="text-xs px-3 py-2 rounded-lg" style={{ color: '#6b7280' }}>← 戻る</button>
              <button
                onClick={remapAndPreview}
                className="text-xs px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
              >
                プレビューを確認 →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: preview */}
        {step === 'preview' && result && (
          <div>
            <div className="mb-3 text-sm text-white">
              <span className="text-green-400 font-bold">{result.total}件</span>のデータを取り込みます（先頭5件を表示）
            </div>
            <div className="rounded-lg overflow-x-auto mb-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <table className="text-xs w-full">
                <thead>
                  <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                    {Object.entries(fieldLabels).filter(([f]) => f !== 'notes').map(([f, l]) => (
                      <th key={f} className="px-3 py-2 text-left text-white whitespace-nowrap">{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#e5e7eb' }}>
                      {Object.keys(fieldLabels).filter(f => f !== 'notes').map(f => (
                        <td key={f} className="px-3 py-2 whitespace-nowrap">
                          {Array.isArray(row[f]) ? (row[f] as string[]).join('/') : (row[f] != null ? String(row[f]) : '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep('mapping')} className="text-xs px-3 py-2 rounded-lg" style={{ color: '#6b7280' }}>← 戻る</button>
              <button
                onClick={confirm}
                className="text-xs px-5 py-2 rounded-lg font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
              >
                ✓ {result.total}件をインポート
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// CSV templates
const PL_CSV_TEMPLATE = `month,revenue,cogs,personnelCost,adCost,officeCost,otherCost,notes
2025-04,1500000,200000,700000,100000,80000,50000,新規2社獲得
2025-05,1800000,250000,700000,120000,80000,60000,
2025-06,2000000,300000,700000,150000,80000,50000,`;

const CLIENT_CSV_TEMPLATE = `name,monthlyFee,services,startDate,status,notes
株式会社サンプル,300000,マーケ支援/SNS運用,2025-01,active,更新検討中
有限会社テスト,150000,広告運用代行,2025-03,active,
株式会社例示,200000,WEB制作,2024-12,at-risk,予算削減の懸念`;

function downloadCSV(content: string, filename: string) {
  const bom = '﻿';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function calcPL(pl: Partial<MonthlyPL>): MonthlyPL {
  const r = pl.revenue ?? 0;
  const c = pl.cogs ?? 0;
  const p = pl.personnelCost ?? 0;
  const a = pl.adCost ?? 0;
  const o = pl.officeCost ?? 0;
  const ot = pl.otherCost ?? 0;
  const grossProfit = r - c;
  const sgaExpenses = p + a + o + ot;
  const operatingProfit = grossProfit - sgaExpenses;
  return {
    month: pl.month ?? '',
    revenue: r, cogs: c,
    personnelCost: p, adCost: a, officeCost: o, otherCost: ot,
    grossProfit, sgaExpenses, operatingProfit,
    notes: pl.notes ?? '',
  };
}

function parsePLCSV(text: string): MonthlyPL[] {
  const lines = text.trim().split('\n').slice(1).filter(l => l.trim());
  return lines.map(line => {
    const [month, revenue, cogs, personnelCost, adCost, officeCost, otherCost, ...noteParts] = line.split(',');
    return calcPL({
      month: month?.trim() || '',
      revenue: Number(revenue) || 0,
      cogs: Number(cogs) || 0,
      personnelCost: Number(personnelCost) || 0,
      adCost: Number(adCost) || 0,
      officeCost: Number(officeCost) || 0,
      otherCost: Number(otherCost) || 0,
      notes: noteParts.join(',').trim(),
    });
  });
}

function parseClientCSV(text: string): Client[] {
  const lines = text.trim().split('\n').slice(1).filter(l => l.trim());
  return lines.map((line, i) => {
    const [name, monthlyFee, services, startDate, status, ...noteParts] = line.split(',');
    return {
      id: `c-${Date.now()}-${i}`,
      name: name?.trim() || '',
      monthlyFee: Number(monthlyFee) || 0,
      services: services ? services.split('/').map(s => s.trim()).filter(Boolean) : [],
      startDate: startDate?.trim() || '',
      status: (status?.trim() as Client['status']) || 'active',
      notes: noteParts.join(',').trim(),
    };
  });
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportPLCSV(monthlyPL: MonthlyPL[]): string {
  const header = 'month,revenue,cogs,personnelCost,adCost,officeCost,otherCost,notes';
  const rows = monthlyPL.map(pl =>
    [pl.month, pl.revenue, pl.cogs, pl.personnelCost, pl.adCost, pl.officeCost, pl.otherCost, pl.notes].map(csvCell).join(',')
  );
  return [header, ...rows].join('\n');
}

function exportClientCSV(clients: Client[]): string {
  const header = 'name,monthlyFee,services,startDate,status,notes';
  const rows = clients.map(c =>
    [c.name, c.monthlyFee, c.services.join('/'), c.startDate, c.status, c.notes].map(csvCell).join(',')
  );
  return [header, ...rows].join('\n');
}

const emptyPL = (): MonthlyPL => {
  const now = new Date();
  return calcPL({
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  });
};

const emptyClient = (): Client => ({
  id: `c-${Date.now()}`,
  name: '', monthlyFee: 0, services: [], startDate: '', status: 'active', notes: '',
});

const serviceOptions = ['マーケ支援', '広告運用代行', 'SNS運用', 'WEB制作', 'コンサル', 'その他'];
const statusConfig = {
  active: { label: '契約中', color: '#22c55e' },
  'at-risk': { label: 'リスクあり', color: '#f59e0b' },
  churned: { label: '解約', color: '#ef4444' },
  negotiating: { label: '交渉中', color: '#6366f1' },
};

const plFields: { key: keyof MonthlyPL; label: string; color?: string }[] = [
  { key: 'revenue', label: '売上高' },
  { key: 'cogs', label: '外注費・制作費' },
  { key: 'personnelCost', label: '人件費' },
  { key: 'adCost', label: '広告宣伝費' },
  { key: 'officeCost', label: '家賃・オフィス費' },
  { key: 'otherCost', label: 'その他経費' },
];

export default function DataPage() {
  const [data, setData] = useState<CompanyData>({ monthlyPL: [], clients: [], actionItems: [] });
  const [activeTab, setActiveTab] = useState<'pl' | 'clients'>('pl');
  const [saved, setSaved] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [importModal, setImportModal] = useState<'pl' | 'clients' | null>(null);
  const [plExcelLoading, setPlExcelLoading] = useState(false);
  const [plExcelPreview, setPlExcelPreview] = useState<PlExcelResult | null>(null);
  const plExcelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('imadoki-company-data');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CompanyData;
        // migrate old PL rows that may be missing new fields
        parsed.monthlyPL = parsed.monthlyPL.map(pl => calcPL({
          ...pl,
          personnelCost: pl.personnelCost ?? 0,
          adCost: pl.adCost ?? 0,
          officeCost: pl.officeCost ?? 0,
          otherCost: pl.otherCost ?? 0,
        }));
        setData(parsed);
      } catch { /* ignore */ }
    }
  }, []);

  const save = (newData: CompanyData) => {
    localStorage.setItem('imadoki-company-data', JSON.stringify(newData));
    setData(newData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };


  const addPL = () => {
    const newRow = emptyPL();
    if (data.monthlyPL.some(pl => pl.month === newRow.month)) {
      // increment month to avoid duplicate
      const [y, m] = newRow.month.split('-').map(Number);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      newRow.month = next;
    }
    save({ ...data, monthlyPL: [...data.monthlyPL, newRow] });
  };
  const updatePL = (i: number, field: keyof MonthlyPL, value: string | number) => {
    const updated = data.monthlyPL.map((pl, idx) => idx === i ? calcPL({ ...pl, [field]: value }) : pl);
    save({ ...data, monthlyPL: updated });
  };
  const deletePL = (i: number) => save({ ...data, monthlyPL: data.monthlyPL.filter((_, idx) => idx !== i) });

  const addClient = () => save({ ...data, clients: [...data.clients, emptyClient()] });
  const updateClient = (i: number, field: keyof Client, value: string | number | string[]) => {
    save({ ...data, clients: data.clients.map((c, idx) => idx === i ? { ...c, [field]: value } : c) });
  };
  const deleteClient = (i: number) => save({ ...data, clients: data.clients.filter((_, idx) => idx !== i) });
  const toggleService = (ci: number, service: string) => {
    const c = data.clients[ci];
    updateClient(ci, 'services', c.services.includes(service) ? c.services.filter(s => s !== service) : [...c.services, service]);
  };

  const totalRevenue = data.clients.filter(c => c.status === 'active').reduce((s, c) => s + c.monthlyFee, 0);

  const btnStyle = (color: string) => ({
    background: `rgba(${color},0.12)`,
    border: `1px solid rgba(${color},0.35)`,
    color: `rgb(${color})`,
  });

  function handleImportConfirm(rows: Record<string, unknown>[], type: 'pl' | 'clients') {
    if (type === 'pl') {
      const newRows = (rows as Partial<MonthlyPL>[]).map(r => calcPL(r));
      save({ ...data, monthlyPL: [...data.monthlyPL, ...newRows] });
    } else {
      save({ ...data, clients: [...data.clients, ...(rows as unknown as Client[])] });
    }
  }

  async function handlePlExcelImport(file: File) {
    setPlExcelLoading(true);
    setCsvError('');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/import-pl-excel', { method: 'POST', body: form });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      // Show preview — user must click 確定 to apply
      setPlExcelPreview(json as PlExcelResult);
    } catch (e) {
      setCsvError('詳細PLインポート失敗: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setPlExcelLoading(false);
      if (plExcelRef.current) plExcelRef.current.value = '';
    }
  }

  // ---------- バックアップ / 復元 ----------
  const BACKUP_KEYS = ['imadoki-company-data', 'imadoki-members', 'imadoki-projects', 'imadoki-tasks', 'imadoki-invoices', 'imadoki-game', 'imadoki-theme'];

  function downloadBackup() {
    const backup: Record<string, unknown> = { _meta: { app: 'imadoki-office', version: 1, exportedAt: new Date().toISOString() } };
    BACKUP_KEYS.forEach(k => {
      const raw = localStorage.getItem(k);
      if (raw != null) { try { backup[k] = JSON.parse(raw); } catch { backup[k] = raw; } }
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `imadoki-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    // チュートリアルの完了検知用
    localStorage.setItem('imadoki-backup-done', new Date().toISOString());
    window.dispatchEvent(new Event('imadoki-tutorial-check'));
  }

  const restoreRef = useRef<HTMLInputElement>(null);
  async function handleRestore(file: File) {
    try {
      const json = JSON.parse(await file.text());
      if (!json._meta || json._meta.app !== 'imadoki-office') {
        setCsvError('このファイルはIMADOKI Officeのバックアップではありません');
        return;
      }
      const count = BACKUP_KEYS.filter(k => k in json).length;
      if (!confirm(`${json._meta.exportedAt?.slice(0, 10) ?? '不明な日付'}のバックアップ（${count}種類のデータ）で現在のデータを上書きします。よろしいですか？`)) return;
      BACKUP_KEYS.forEach(k => {
        if (k in json) {
          localStorage.setItem(k, typeof json[k] === 'string' ? json[k] : JSON.stringify(json[k]));
        }
      });
      window.location.reload();
    } catch {
      setCsvError('バックアップファイルの読み込みに失敗しました');
    } finally {
      if (restoreRef.current) restoreRef.current.value = '';
    }
  }

  function applyPlExcelImport() {
    if (!plExcelPreview) return;
    const merged = [...data.monthlyPL];
    (plExcelPreview.monthlyPL ?? []).forEach((r: MonthlyPL) => {
      const idx = merged.findIndex(m => m.month === r.month);
      if (idx >= 0) merged[idx] = r; else merged.push(r);
    });
    merged.sort((a, b) => a.month.localeCompare(b.month));
    save({ ...data, monthlyPL: merged, clientRevenue: plExcelPreview.clientRevenue ?? data.clientRevenue });
    setPlExcelPreview(null);
    import('@/lib/gamification').then(m => m.addXp('pl-import'));
  }

  return (
    <div className="max-w-7xl mx-auto">
      {importModal && (
        <SmartImportModal
          type={importModal}
          onClose={() => setImportModal(null)}
          onConfirm={rows => { handleImportConfirm(rows, importModal); setImportModal(null); }}
        />
      )}

      {/* PL Excel 確定モーダル */}
      {plExcelPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setPlExcelPreview(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: '#0d0d1a', border: '1px solid rgba(99,102,241,0.3)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>
                <h3 className="text-white font-bold text-base">📊 読み込み内容の確認</h3>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>内容を確認して「確定して反映」を押してください</p>
              </div>
              <button onClick={() => setPlExcelPreview(null)} className="text-lg" style={{ color: '#6b7280' }}>✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '読み込んだ月数', value: `${plExcelPreview.monthlyPL.length}ヶ月` },
                  { label: 'クライアント数', value: `${plExcelPreview.clientRevenue.length}社` },
                  { label: '売上合計', value: `¥${plExcelPreview.monthlyPL.reduce((s, m) => s + m.revenue, 0).toLocaleString()}` },
                ].map(c => (
                  <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div className="text-xs mb-1" style={{ color: '#818cf8' }}>{c.label}</div>
                    <div className="text-white font-bold text-sm">{c.value}</div>
                  </div>
                ))}
              </div>

              {/* Monthly PL */}
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: '#94a3b8' }}>月次PL（{plExcelPreview.monthlyPL.length}ヶ月）</div>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)', color: '#6b7280' }}>
                        <th className="text-left px-3 py-2">月</th>
                        <th className="text-right px-3 py-2">売上</th>
                        <th className="text-right px-3 py-2">原価</th>
                        <th className="text-right px-3 py-2">粗利</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plExcelPreview.monthlyPL.map(m => (
                        <tr key={m.month} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td className="px-3 py-1.5 text-white">{m.month}</td>
                          <td className="px-3 py-1.5 text-right" style={{ color: '#e2e8f0' }}>¥{m.revenue.toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right" style={{ color: '#94a3b8' }}>¥{m.cogs.toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-right" style={{ color: '#4ade80' }}>¥{m.grossProfit.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Clients */}
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: '#94a3b8' }}>クライアント別売上（{plExcelPreview.clientRevenue.length}社）</div>
                <div className="rounded-lg overflow-hidden max-h-52 overflow-y-auto" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <table className="w-full text-xs">
                    <thead className="sticky top-0" style={{ background: '#12121f' }}>
                      <tr style={{ color: '#6b7280' }}>
                        <th className="text-left px-3 py-2">クライアント</th>
                        <th className="text-left px-3 py-2">事業部</th>
                        <th className="text-right px-3 py-2">売上</th>
                        <th className="text-right px-3 py-2">粗利率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...plExcelPreview.clientRevenue].sort((a, b) => b.totalRevenue - a.totalRevenue).map(c => {
                        const rate = c.totalRevenue > 0 ? ((c.totalRevenue - c.totalCogs) / c.totalRevenue) * 100 : 0;
                        return (
                          <tr key={`${c.businessUnit}-${c.clientName}`} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <td className="px-3 py-1.5 text-white truncate max-w-[220px]">{c.clientName}</td>
                            <td className="px-3 py-1.5" style={{ color: '#818cf8' }}>{BU_LABELS[c.businessUnit] ?? c.businessUnit}</td>
                            <td className="px-3 py-1.5 text-right" style={{ color: '#e2e8f0' }}>¥{c.totalRevenue.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-right" style={{ color: rate >= 50 ? '#4ade80' : rate >= 20 ? '#facc15' : '#f87171' }}>
                              {rate.toFixed(0)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <button onClick={() => setPlExcelPreview(null)}
                className="px-5 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                キャンセル
              </button>
              <button onClick={applyPlExcelImport}
                className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                ✓ 確定して反映
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-bold flex items-center gap-2" style={{ fontSize: '22px', color: '#f1f5f9' }}>📥 経営データ入力</h1>
          <p className="mt-1" style={{ fontSize: '13px', color: '#94a3b8' }}>売上実績とクライアント情報を集約 — 入力したデータがそのままAI経営分析の材料になります</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <span className="text-xs text-green-400">✅ 保存しました</span>
          </div>
        )}
      </div>

      {/* Import / Export Banner */}
      <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>📂 データのインポート</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>CSV / Excel対応</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {/* IMADOKI PL Excel Import — primary */}
          <button
            onClick={() => plExcelRef.current?.click()}
            disabled={plExcelLoading}
            className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all hover:opacity-90 text-left"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(168,85,247,0.9))',
              border: '1px solid rgba(165,180,252,0.4)',
              opacity: plExcelLoading ? 0.6 : 1,
              cursor: plExcelLoading ? 'wait' : 'pointer',
            }}
          >
            <span className="text-3xl">{plExcelLoading ? '⏳' : '📊'}</span>
            <span className="flex flex-col">
              <span className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">詳細PLインポート</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>推奨</span>
              </span>
              <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {plExcelLoading ? '読み込み中です…' : 'IMADOKIのPL Excelをそのままアップロード。月次PL＋クライアント別売上を一括登録'}
              </span>
            </span>
          </button>
          <input ref={plExcelRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePlExcelImport(f); }} />

          {/* Secondary: generic imports */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setImportModal('pl')}
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl transition-all hover:opacity-90 text-center"
              style={btnStyle('99,102,241')}
            >
              <span className="text-xl">📤</span>
              <span className="text-xs font-medium">汎用CSVインポート（P&L）</span>
              <span className="text-xs opacity-60">どんな列名でも自動認識</span>
            </button>
            <button
              onClick={() => setImportModal('clients')}
              className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl transition-all hover:opacity-90 text-center"
              style={btnStyle('168,85,247')}
            >
              <span className="text-xl">📤</span>
              <span className="text-xs font-medium">汎用CSVインポート（クライアント）</span>
              <span className="text-xs opacity-60">どんな列名でも自動認識</span>
            </button>
          </div>
        </div>

        {/* Template downloads — auxiliary text links */}
        <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: '#64748b' }}>
          <span>テンプレートが必要な方：</span>
          <button
            onClick={() => downloadCSV(PL_CSV_TEMPLATE, 'PL_テンプレート.csv')}
            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            style={{ color: '#94a3b8' }}
          >
            ⬇ P&L用CSVテンプレート
          </button>
          <button
            onClick={() => downloadCSV(CLIENT_CSV_TEMPLATE, 'クライアント_テンプレート.csv')}
            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            style={{ color: '#94a3b8' }}
          >
            ⬇ クライアント用CSVテンプレート
          </button>
        </div>
        <p className="text-xs mt-2.5" style={{ color: '#64748b' }}>
          💡 IMADOKIの「PL全体」「売上原価」シートを含むExcelなら「詳細PLインポート」が最速です。他社形式のCSV・Excelは汎用CSVインポートをご利用ください（列名は自動で認識されます）
        </p>
      </div>

      {/* バックアップ / 復元 */}
      <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-3 flex-wrap"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="text-sm" style={{ color: '#94a3b8' }}>🛡️ 大切な経営データを守る:</span>
        <button onClick={downloadBackup}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
          💾 バックアップをダウンロード
        </button>
        <button onClick={() => restoreRef.current?.click()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
          ↩️ バックアップから復元
        </button>
        <input ref={restoreRef} type="file" accept=".json" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleRestore(f); }} />
        <span className="text-xs" style={{ color: '#4b5563' }}>
          データはこのブラウザ内に保存されています。定期的なバックアップをおすすめします
        </span>
      </div>

      {csvError && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠️ {csvError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[{ id: 'pl', label: '📊 月次P&L' }, { id: 'clients', label: '👥 クライアント一覧' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'pl' | 'clients')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.id ? '#a5b4fc' : '#6b7280',
              border: `1px solid ${activeTab === tab.id ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== P&L Tab ===== */}
      {activeTab === 'pl' && (
        <div>
          {/* Summary cards if data exists */}
          {data.monthlyPL.length > 0 && (() => {
            const sorted = [...data.monthlyPL].sort((a, b) => a.month.localeCompare(b.month));
            const latest = sorted[sorted.length - 1];
            const totalRev = data.monthlyPL.reduce((s, m) => s + m.revenue, 0);
            const avgOp = data.monthlyPL.reduce((s, m) => s + m.operatingProfit, 0) / data.monthlyPL.length;
            const grossRate = latest.revenue > 0 ? Math.round((latest.grossProfit / latest.revenue) * 100) : 0;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: '直近月売上', value: `¥${latest.revenue.toLocaleString()}`, color: '#a5b4fc' },
                  { label: '直近月粗利率', value: `${grossRate}%`, color: latest.grossProfit >= 0 ? '#22c55e' : '#ef4444' },
                  { label: '直近月営業利益', value: `¥${latest.operatingProfit.toLocaleString()}`, color: latest.operatingProfit >= 0 ? '#22c55e' : '#ef4444' },
                  { label: '累計売上', value: `¥${totalRev.toLocaleString()}`, color: '#f59e0b' },
                ].map(card => (
                  <div key={card.label} className="glass rounded-xl p-3 text-center">
                    <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{card.label}</div>
                    <div className="text-base font-bold" style={{ color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">月次損益計算書</h2>
              <button onClick={addPL} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
                + 月を追加
              </button>
            </div>

            {data.monthlyPL.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-sm mb-1" style={{ color: '#94a3b8' }}>月次P&Lデータがまだありません</p>
                <p className="text-xs mb-2" style={{ color: '#64748b' }}>上の「詳細PLインポート」でExcelを取り込むのが最速です。手入力で始めることもできます</p>
                <button onClick={addPL} className="px-4 py-2 rounded-lg text-sm text-white mt-2" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                  最初の月を手動追加
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {data.monthlyPL.map((pl, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Month header */}
                    <div className="flex items-center justify-between mb-3">
                      <input type="month" value={pl.month} onChange={e => updatePL(i, 'month', e.target.value)}
                        className="text-sm font-bold text-white bg-transparent outline-none" />
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                          background: pl.operatingProfit >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: pl.operatingProfit >= 0 ? '#22c55e' : '#ef4444',
                          border: `1px solid ${pl.operatingProfit >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}>
                          営業利益 ¥{pl.operatingProfit.toLocaleString()}
                        </span>
                        <button onClick={() => deletePL(i)} className="text-xs text-red-500 hover:text-red-400">✕ 削除</button>
                      </div>
                    </div>

                    {/* Input grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                      {plFields.map(f => (
                        <div key={f.key}>
                          <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>{f.label}</label>
                          <input
                            type="number"
                            value={(pl[f.key] as number) || ''}
                            onChange={e => updatePL(i, f.key, Number(e.target.value))}
                            className="w-full rounded-lg px-2 py-2 text-sm text-white outline-none text-right"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Auto-calc display */}
                    <div className="grid grid-cols-3 gap-3 mb-3 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.06)' }}>
                      <div className="text-center">
                        <div className="text-xs mb-0.5" style={{ color: '#6b7280' }}>粗利</div>
                        <div className="text-sm font-bold" style={{ color: pl.grossProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                          ¥{pl.grossProfit.toLocaleString()}
                          {pl.revenue > 0 && <span className="text-xs ml-1 opacity-70">({Math.round(pl.grossProfit / pl.revenue * 100)}%)</span>}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs mb-0.5" style={{ color: '#6b7280' }}>販管費合計</div>
                        <div className="text-sm font-bold" style={{ color: '#f59e0b' }}>¥{pl.sgaExpenses.toLocaleString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs mb-0.5" style={{ color: '#6b7280' }}>営業利益</div>
                        <div className="text-sm font-bold" style={{ color: pl.operatingProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                          ¥{pl.operatingProfit.toLocaleString()}
                          {pl.revenue > 0 && <span className="text-xs ml-1 opacity-70">({Math.round(pl.operatingProfit / pl.revenue * 100)}%)</span>}
                        </div>
                      </div>
                    </div>

                    <div>
                      <input value={pl.notes} onChange={e => updatePL(i, 'notes', e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm bg-transparent outline-none"
                        style={{ border: '1px solid rgba(255,255,255,0.06)', color: '#9ca3af' }}
                        placeholder="メモ（例：新規2社獲得、大型案件受注など）" />
                    </div>
                  </div>
                ))}

                {/* Export button */}
                {data.monthlyPL.length > 0 && (
                  <div className="text-right">
                    <button
                      onClick={() => downloadCSV(exportPLCSV(data.monthlyPL), `PL_${new Date().toISOString().slice(0,10)}.csv`)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={btnStyle('34,197,94')}
                    >
                      ⬇️ 現在のデータをCSVエクスポート
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Clients Tab ===== */}
      {activeTab === 'clients' && (
        <div>
          <div className="glass rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs" style={{ color: '#6b7280' }}>契約中クライアント月次合計</span>
              <div className="text-xl font-bold text-white">¥{totalRevenue.toLocaleString()}</div>
              <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                {data.clients.filter(c => c.status === 'active').length}社契約中
                {data.clients.filter(c => c.status === 'at-risk').length > 0 && (
                  <span className="ml-2 text-amber-400">⚠️ リスクあり {data.clients.filter(c => c.status === 'at-risk').length}社</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={addClient} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
                + クライアント追加
              </button>
              {data.clients.length > 0 && (
                <button
                  onClick={() => downloadCSV(exportClientCSV(data.clients), `クライアント_${new Date().toISOString().slice(0,10)}.csv`)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all"
                  style={btnStyle('34,197,94')}
                >
                  ⬇️ CSVエクスポート
                </button>
              )}
            </div>
          </div>

          {data.clients.length === 0 ? (
            <div className="glass rounded-xl text-center py-12">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-sm mb-1" style={{ color: '#94a3b8' }}>クライアント情報がまだありません</p>
              <p className="text-xs mb-4" style={{ color: '#64748b' }}>クライアントを登録すると、月次売上の内訳や解約リスクをAIが分析できるようになります</p>
              <button onClick={addClient} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                最初のクライアントを追加
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.clients.map((client, i) => (
                <div key={client.id} className="glass rounded-xl p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>クライアント名</label>
                      <input value={client.name} onChange={e => updateClient(i, 'name', e.target.value)}
                        placeholder="株式会社〇〇"
                        className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>月額（円）</label>
                      <input type="number" value={client.monthlyFee || ''} onChange={e => updateClient(i, 'monthlyFee', Number(e.target.value))}
                        placeholder="300000"
                        className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>契約開始</label>
                      <input type="month" value={client.startDate} onChange={e => updateClient(i, 'startDate', e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>ステータス</label>
                      <select value={client.status} onChange={e => updateClient(i, 'status', e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: statusConfig[client.status].color }}>
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                          <option key={key} value={key} style={{ background: '#0f0f1a', color: cfg.color }}>{cfg.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs mb-1.5 block" style={{ color: '#6b7280' }}>サービス種別</label>
                    <div className="flex flex-wrap gap-2">
                      {serviceOptions.map(s => (
                        <button key={s} onClick={() => toggleService(i, s)}
                          className="text-xs px-2.5 py-1 rounded-lg transition-all"
                          style={{
                            background: client.services.includes(s) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                            color: client.services.includes(s) ? '#a5b4fc' : '#6b7280',
                            border: `1px solid ${client.services.includes(s) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>メモ・特記事項</label>
                      <input value={client.notes} onChange={e => updateClient(i, 'notes', e.target.value)}
                        placeholder="契約更新時期、課題など..."
                        className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    <button onClick={() => deleteClient(i)} className="px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 transition-colors"
                      style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      {(data.monthlyPL.length > 0 || data.clients.length > 0) && (
        <div className="mt-6 p-4 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="text-sm mb-3" style={{ color: '#818cf8' }}>
            データ入力が完了したら、AI分析を実行して社長室で承認ワークフローを開始できます
          </p>
          <a href="/ceo/analysis" className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            🔍 AI分析・承認ページへ →
          </a>
        </div>
      )}
    </div>
  );
}
