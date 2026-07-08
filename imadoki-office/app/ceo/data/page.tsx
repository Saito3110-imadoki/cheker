'use client';

import { useState, useEffect, useRef } from 'react';
import { CompanyData, MonthlyPL, Client } from '@/lib/ceo-types';

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

function exportPLCSV(monthlyPL: MonthlyPL[]): string {
  const header = 'month,revenue,cogs,personnelCost,adCost,officeCost,otherCost,notes';
  const rows = monthlyPL.map(pl =>
    `${pl.month},${pl.revenue},${pl.cogs},${pl.personnelCost},${pl.adCost},${pl.officeCost},${pl.otherCost},${pl.notes}`
  );
  return [header, ...rows].join('\n');
}

function exportClientCSV(clients: Client[]): string {
  const header = 'name,monthlyFee,services,startDate,status,notes';
  const rows = clients.map(c =>
    `${c.name},${c.monthlyFee},${c.services.join('/')},${c.startDate},${c.status},${c.notes}`
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
  const plFileRef = useRef<HTMLInputElement>(null);
  const clientFileRef = useRef<HTMLInputElement>(null);

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

  const handleCSVUpload = (file: File, type: 'pl' | 'clients') => {
    setCsvError('');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        let text = e.target?.result as string;
        // strip BOM if present
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        if (type === 'pl') {
          const parsed = parsePLCSV(text);
          if (parsed.length === 0) throw new Error('データが見つかりません');
          save({ ...data, monthlyPL: [...data.monthlyPL, ...parsed] });
        } else {
          const parsed = parseClientCSV(text);
          if (parsed.length === 0) throw new Error('データが見つかりません');
          save({ ...data, clients: [...data.clients, ...parsed] });
        }
      } catch {
        setCsvError('CSVの読み込みに失敗しました。テンプレートの形式を確認してください。');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const addPL = () => save({ ...data, monthlyPL: [...data.monthlyPL, emptyPL()] });
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">📥 経営データ入力</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>売上実績・クライアント情報を入力してAI分析に活用</p>
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
          <span className="text-sm font-semibold text-white">📂 データのインポート・エクスポート</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>CSV / Excel対応</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* P&L Import */}
          <button
            onClick={() => plFileRef.current?.click()}
            className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl transition-all hover:opacity-90 text-center"
            style={btnStyle('99,102,241')}
          >
            <span className="text-xl">📤</span>
            <span className="text-xs font-medium">P&L インポート</span>
            <span className="text-xs opacity-60">CSV/Excelを読み込む</span>
          </button>
          <input ref={plFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => e.target.files?.[0] && handleCSVUpload(e.target.files[0], 'pl')} />

          {/* P&L Template */}
          <button
            onClick={() => downloadCSV(PL_CSV_TEMPLATE, 'PL_テンプレート.csv')}
            className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl transition-all hover:opacity-90 text-center"
            style={btnStyle('34,197,94')}
          >
            <span className="text-xl">📥</span>
            <span className="text-xs font-medium">P&L テンプレート</span>
            <span className="text-xs opacity-60">CSVサンプルDL</span>
          </button>

          {/* Client Import */}
          <button
            onClick={() => clientFileRef.current?.click()}
            className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl transition-all hover:opacity-90 text-center"
            style={btnStyle('168,85,247')}
          >
            <span className="text-xl">📤</span>
            <span className="text-xs font-medium">クライアント インポート</span>
            <span className="text-xs opacity-60">CSV/Excelを読み込む</span>
          </button>
          <input ref={clientFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => e.target.files?.[0] && handleCSVUpload(e.target.files[0], 'clients')} />

          {/* Client Template */}
          <button
            onClick={() => downloadCSV(CLIENT_CSV_TEMPLATE, 'クライアント_テンプレート.csv')}
            className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl transition-all hover:opacity-90 text-center"
            style={btnStyle('245,158,11')}
          >
            <span className="text-xl">📥</span>
            <span className="text-xs font-medium">クライアント テンプレート</span>
            <span className="text-xs opacity-60">CSVサンプルDL</span>
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: '#4b5563' }}>
          ※ Excelの場合は「名前を付けて保存」→「CSV（カンマ区切り）」で保存してからインポートしてください
        </p>
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
            const latest = data.monthlyPL[data.monthlyPL.length - 1];
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
                <p className="text-sm mb-2" style={{ color: '#6b7280' }}>月次データを追加するか、上のCSVインポートを使ってください</p>
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
              <p className="text-sm mb-4" style={{ color: '#6b7280' }}>クライアントを追加するか、上のCSVインポートを使ってください</p>
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
