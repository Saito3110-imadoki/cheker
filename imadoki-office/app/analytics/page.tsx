'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { CompanyData, ClientRevenue } from '@/lib/ceo-types';
import { forecastCashflow, type CashflowMonth } from '@/lib/finance-model';

interface InvoiceLite {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  status: string;
  total: number;
}

const INV_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: '#94a3b8' },
  sent: { label: '送付済', color: '#60a5fa' },
  paid: { label: '入金済', color: '#4ade80' },
  overdue: { label: '期限超過', color: '#f87171' },
};

const BU_LABELS: Record<string, string> = {
  web: 'Web事業部', ads: '広告事業部', sns: 'SNS運用', media: 'メディア',
};
const BU_COLORS: Record<string, string> = {
  web: 'rgba(99,102,241,0.8)', ads: 'rgba(168,85,247,0.8)',
  sns: 'rgba(34,197,94,0.8)', media: 'rgba(251,191,36,0.8)',
};

type Period = 'all' | 'thisYear' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'custom';

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `¥${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `¥${(n / 1_000).toFixed(0)}K`;
  return `¥${n.toLocaleString()}`;
}

// IMADOKIの会計年度は12月始まり（第1四半期 = 12月〜2月）— PL Excelの四半期区分と一致させる
function fiscalYearStart(now: Date): string {
  // 12月以降なら当年12月、それ以前なら前年12月が期首
  const y = now.getMonth() + 1 >= 12 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-12`;
}

function filterMonths(months: string[], period: Period, customFrom: string, customTo: string): string[] {
  const now = new Date();
  const fyStart = fiscalYearStart(now);
  const fyEndYear = Number(fyStart.slice(0, 4)) + 1;
  const fyEnd = `${fyEndYear}-11`;
  return months.filter(m => {
    if (period === 'all') return true;
    if (period === 'thisYear') return m >= fyStart && m <= fyEnd;
    if (period === 'Q1') return ['12','01','02'].includes(m.slice(5,7));
    if (period === 'Q2') return ['03','04','05'].includes(m.slice(5,7));
    if (period === 'Q3') return ['06','07','08'].includes(m.slice(5,7));
    if (period === 'Q4') return ['09','10','11'].includes(m.slice(5,7));
    if (period === 'custom') return m >= customFrom && m <= customTo;
    return true;
  });
}

interface ClientStat {
  clientName: string;
  businessUnit: string;
  totalRevenue: number;
  totalCogs: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<CompanyData | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [buFilter, setBuFilter] = useState<string>('all');
  const [cashflow, setCashflow] = useState<{ forecast: CashflowMonth[]; warning: string | null; hasSettings: boolean } | null>(null);
  const [invoices, setInvoices] = useState<InvoiceLite[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRevenue | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('imadoki-company-data');
      if (raw) setData(JSON.parse(raw));
    } catch { /* ignore */ }
    try {
      setInvoices(JSON.parse(localStorage.getItem('imadoki-invoices') || '[]'));
    } catch { /* ignore */ }
    try {
      setCashflow(forecastCashflow(6));
    } catch { /* ignore */ }
  }, []);

  const clientRevenue: ClientRevenue[] = data?.clientRevenue ?? [];

  const allMonths = useMemo(() => {
    const set = new Set<string>();
    clientRevenue.forEach(c => c.monthly.forEach(m => set.add(m.month)));
    return Array.from(set).sort();
  }, [clientRevenue]);

  const filteredMonths = useMemo(
    () => filterMonths(allMonths, period, customFrom, customTo),
    [allMonths, period, customFrom, customTo]
  );

  const clientStats: ClientStat[] = useMemo(() => {
    return clientRevenue.map(c => {
      const filtered = c.monthly.filter(m => filteredMonths.includes(m.month));
      return {
        clientName: c.clientName,
        businessUnit: c.businessUnit,
        totalRevenue: filtered.reduce((s, x) => s + x.revenue, 0),
        totalCogs: filtered.reduce((s, x) => s + x.cogs, 0),
      };
    }).filter(c => c.totalRevenue > 0);
  }, [clientRevenue, filteredMonths]);

  const top10 = useMemo(
    () => [...clientStats].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10),
    [clientStats]
  );

  const buTotals = useMemo(() => {
    const map: Record<string, number> = { web: 0, ads: 0, sns: 0, media: 0 };
    clientStats.forEach(c => { if (c.businessUnit in map) map[c.businessUnit] += c.totalRevenue; });
    return map;
  }, [clientStats]);

  const grandTotal = Object.values(buTotals).reduce((s, v) => s + v, 0);

  const top3Share = useMemo(() => {
    const sorted = [...clientStats].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 3);
    const top3 = sorted.reduce((s, c) => s + c.totalRevenue, 0);
    return grandTotal > 0 ? (top3 / grandTotal) * 100 : 0;
  }, [clientStats, grandTotal]);

  const monthlyByBU = useMemo(() => {
    return filteredMonths.map(month => {
      const buData = { web: 0, ads: 0, sns: 0, media: 0 } as { web: number; ads: number; sns: number; media: number };
      clientRevenue.forEach(c => {
        const m = c.monthly.find(x => x.month === month);
        if (m && c.businessUnit in buData) buData[c.businessUnit] += m.revenue;
      });
      return { month, ...buData };
    });
  }, [clientRevenue, filteredMonths]);

  const filteredClients = useMemo(() =>
    clientStats.filter(c => buFilter === 'all' || c.businessUnit === buFilter)
      .sort((a, b) => b.totalRevenue - a.totalRevenue),
    [clientStats, buFilter]
  );

  const glassStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '20px',
  };

  if (!data || clientRevenue.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ ...glassStyle, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <h2 style={{ color: '#a5b4fc', fontSize: 20, marginBottom: 12 }}>クライアントデータがありません</h2>
          <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
            Excelファイルをインポートしてクライアント別売上データを読み込んでください。
          </p>
          <Link href="/ceo/data"
            style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 8, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', textDecoration: 'none', fontSize: 14 }}>
            データ入力ページへ →
          </Link>
        </div>
      </div>
    );
  }

  const maxBarRevenue = top10[0]?.totalRevenue ?? 1;
  const maxMonthlyTotal = Math.max(...monthlyByBU.map(m => m.web + m.ads + m.sns + m.media), 1);

  // Donut chart
  const DONUT_R = 70;
  const DONUT_CX = 90;
  const DONUT_CY = 90;
  const strokeW = 28;
  const circumference = 2 * Math.PI * DONUT_R;
  let donutOffset = 0;
  const donutSlices = Object.entries(buTotals).map(([bu, val]) => {
    const pct = grandTotal > 0 ? val / grandTotal : 0;
    const dash = pct * circumference;
    const slice = { bu, val, pct, dash, offset: donutOffset };
    donutOffset += dash;
    return slice;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>アナリティクス</h1>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>クライアント別・事業部別の売上と粗利をひと目で把握し、依存リスクまでチェック</p>
      </div>

      {/* Period filter */}
      <div style={{ ...glassStyle, marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: '#6b7280', fontSize: 13 }}>期間:</span>
        {(['all','thisYear','Q1','Q2','Q3','Q4','custom'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              background: period === p ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${period === p ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
              color: period === p ? '#a5b4fc' : '#9ca3af',
            }}>
            {p === 'all' ? '全期間'
              : p === 'thisYear' ? '今期'
              : p === 'custom' ? '期間指定'
              : p === 'Q1' ? '1Q（12-2月）'
              : p === 'Q2' ? '2Q（3-5月）'
              : p === 'Q3' ? '3Q（6-8月）'
              : '4Q（9-11月）'}
          </button>
        ))}
        {period === 'custom' && (
          <>
            <input type="month" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e2e8f0', padding: '4px 8px', fontSize: 13 }} />
            <span style={{ color: '#6b7280' }}>〜</span>
            <input type="month" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e2e8f0', padding: '4px 8px', fontSize: 13 }} />
          </>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 20 }}>
        <div style={glassStyle}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>期間内売上</div>
          <div style={{ color: '#a5b4fc', fontSize: 22, fontWeight: 700 }}>{fmtMoney(grandTotal)}</div>
        </div>
        {(() => {
          const totalCogs = clientStats.reduce((s, c) => s + c.totalCogs, 0);
          const gpRate = grandTotal > 0 ? ((grandTotal - totalCogs) / grandTotal) * 100 : 0;
          return (
            <div style={glassStyle}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>粗利率</div>
              <div style={{ color: gpRate >= 40 ? '#4ade80' : gpRate >= 20 ? '#facc15' : '#f87171', fontSize: 22, fontWeight: 700 }}>
                {gpRate.toFixed(1)}%
              </div>
              <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>粗利 {fmtMoney(grandTotal - totalCogs)}</div>
            </div>
          );
        })()}
        <div style={glassStyle}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>取引クライアント</div>
          <div style={{ color: '#a5b4fc', fontSize: 22, fontWeight: 700 }}>{clientStats.length}<span style={{ fontSize: 14, color: '#6b7280', marginLeft: 2 }}>社</span></div>
        </div>
        <div style={{ ...glassStyle, borderColor: top3Share > 50 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)' }}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>売上依存度（上位3社）</div>
          <div style={{ color: top3Share > 50 ? '#f87171' : '#4ade80', fontSize: 22, fontWeight: 700 }}>{top3Share.toFixed(1)}%</div>
          <div style={{ color: top3Share > 50 ? '#f87171' : '#6b7280', fontSize: 11, marginTop: 4 }}>
            {top3Share > 50 ? '⚠ 特定クライアントへの依存が高め' : '✓ 分散は健全な水準'}
          </div>
        </div>
      </div>

      {/* Bar chart + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 20 }}>
        {/* Top10 bar chart */}
        <div style={glassStyle}>
          <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>クライアント別売上ランキング TOP10</h3>
          <svg width="100%" viewBox={`0 0 500 ${top10.length * 36 + 10}`}>
            {top10.map((c, i) => {
              const barW = Math.max((c.totalRevenue / maxBarRevenue) * 290, 4);
              const y = i * 36 + 4;
              // 長いバーはラベルをバー内（右寄せ・白）、短いバーは外側に表示して見切れを防ぐ
              const labelInside = barW > 70;
              return (
                <g key={c.clientName}>
                  <text x="0" y={y + 14} fill="#9ca3af" fontSize="11">{i + 1}.</text>
                  <text x="18" y={y + 14} fill="#e2e8f0" fontSize="11" style={{ fontWeight: 500 }}>{c.clientName.slice(0, 14)}</text>
                  <rect x="150" y={y + 2} width={barW} height={20} rx="4" fill={BU_COLORS[c.businessUnit] ?? 'rgba(99,102,241,0.6)'} />
                  {labelInside ? (
                    <text x={150 + barW - 6} y={y + 15} textAnchor="end" fill="#ffffff" fontSize="11" fontWeight="600">{fmtMoney(c.totalRevenue)}</text>
                  ) : (
                    <text x={158 + barW} y={y + 15} fill="#a5b4fc" fontSize="11">{fmtMoney(c.totalRevenue)}</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Donut chart */}
        <div style={{ ...glassStyle, minWidth: 200 }}>
          <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>事業部別比率</h3>
          <svg width="180" height="180" viewBox="0 0 180 180">
            {donutSlices.map(s => (
              <circle key={s.bu}
                cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R}
                fill="none" stroke={BU_COLORS[s.bu]} strokeWidth={strokeW}
                strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                strokeDashoffset={-s.offset}
                transform={`rotate(-90 ${DONUT_CX} ${DONUT_CY})`}
              />
            ))}
            <text x={DONUT_CX} y={DONUT_CY - 6} textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700">{fmtMoney(grandTotal)}</text>
            <text x={DONUT_CX} y={DONUT_CY + 10} textAnchor="middle" fill="#6b7280" fontSize="10">合計</text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {donutSlices.map(s => (
              <div key={s.bu} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: BU_COLORS[s.bu], flexShrink: 0 }} />
                <span style={{ color: '#9ca3af', fontSize: 12 }}>{BU_LABELS[s.bu]}</span>
                <span style={{ color: '#a5b4fc', fontSize: 12, marginLeft: 'auto' }}>{(s.pct * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly stacked bar */}
      {monthlyByBU.length > 0 && (
        <div style={{ ...glassStyle, marginBottom: 20 }}>
          <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>月次推移（事業部別積み上げ）</h3>
          <div style={{ overflowX: 'auto' }}>
            <svg width={Math.max(500, monthlyByBU.length * 52 + 60)} height="220" viewBox={`0 0 ${Math.max(500, monthlyByBU.length * 52 + 60)} 220`}>
              {monthlyByBU.map((m, i) => {
                const x = 40 + i * 52;
                const totalH = 160;
                const buKeys = ['web', 'ads', 'sns', 'media'] as const;
                let stackY = 200;
                return (
                  <g key={m.month}>
                    {buKeys.map(bu => {
                      const val = m[bu] ?? 0;
                      const h = maxMonthlyTotal > 0 ? (val / maxMonthlyTotal) * totalH : 0;
                      stackY -= h;
                      return h > 0 ? (
                        <rect key={bu} x={x} y={stackY} width={40} height={h} fill={BU_COLORS[bu]} rx="2" />
                      ) : null;
                    })}
                    <text x={x + 20} y={215} textAnchor="middle" fill="#6b7280" fontSize="9">{m.month.slice(5)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {Object.entries(BU_LABELS).map(([bu, label]) => (
              <div key={bu} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: BU_COLORS[bu] }} />
                <span style={{ color: '#9ca3af', fontSize: 12 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cashflow forecast */}
      {cashflow && cashflow.forecast.length > 0 && (() => {
        const fc = cashflow.forecast;
        const maxBal = Math.max(...fc.map(f => f.balance), 0);
        const minBal = Math.min(...fc.map(f => f.balance), 0);
        const range = Math.max(maxBal - minBal, 1);
        const W = Math.max(500, fc.length * 90 + 60);
        const chartTop = 20, chartH = 130;
        const yOf = (v: number) => chartTop + ((maxBal - v) / range) * chartH;
        const xOf = (i: number) => 60 + i * ((W - 100) / Math.max(fc.length - 1, 1));
        const points = fc.map((f, i) => `${xOf(i)},${yOf(f.balance)}`).join(' ');
        return (
          <div style={{ ...glassStyle, marginBottom: 20 }}>
            <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, marginBottom: 12 }}>キャッシュフロー予測（6ヶ月）</h3>
            {cashflow.warning && (
              <div style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 12 }}>
                ⚠ {cashflow.warning}
              </div>
            )}
            {!cashflow.hasSettings && (
              <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fbbf24', fontSize: 13, marginBottom: 12 }}>
                現金残高と固定費を設定すると予測が正確になります →{' '}
                <Link href="/ceo/data" style={{ color: '#a5b4fc', textDecoration: 'underline' }}>データ入力の固定費・設定タブへ</Link>
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <svg width={W} height="230" viewBox={`0 0 ${W} 230`}>
                {/* zero line */}
                {minBal < 0 && (
                  <line x1={40} y1={yOf(0)} x2={W - 20} y2={yOf(0)} stroke="rgba(248,113,113,0.4)" strokeDasharray="4 4" />
                )}
                <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" />
                {fc.map((f, i) => {
                  const neg = f.balance < 0;
                  return (
                    <g key={f.month}>
                      <circle cx={xOf(i)} cy={yOf(f.balance)} r="4" fill={neg ? '#f87171' : '#6366f1'} />
                      <text x={xOf(i)} y={yOf(f.balance) - 10} textAnchor="middle" fill={neg ? '#f87171' : '#a5b4fc'} fontSize="11" fontWeight="600">
                        {fmtMoney(f.balance)}
                      </text>
                      <text x={xOf(i)} y={185} textAnchor="middle" fill={neg ? '#f87171' : '#9ca3af'} fontSize="10" fontWeight={neg ? 700 : 400}>
                        {Number(f.month.slice(5, 7))}月
                      </text>
                      <text x={xOf(i)} y={202} textAnchor="middle" fill="#4ade80" fontSize="9">入 {fmtMoney(f.inflow)}</text>
                      <text x={xOf(i)} y={216} textAnchor="middle" fill="#f87171" fontSize="9">出 {fmtMoney(f.outflow)}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        );
      })()}

      {/* Client table */}
      <div style={glassStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600 }}>クライアント一覧</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {(['all', 'web', 'ads', 'sns', 'media'] as const).map(bu => (
              <button key={bu} onClick={() => setBuFilter(bu)}
                style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  background: buFilter === bu ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${buFilter === bu ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: buFilter === bu ? '#a5b4fc' : '#6b7280',
                }}>
                {bu === 'all' ? '全て' : BU_LABELS[bu]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['クライアント名','事業部','売上','原価','粗利','粗利率'].map(h => (
                  <th key={h} style={{ textAlign: h === 'クライアント名' ? 'left' : 'right', color: '#6b7280', padding: '8px 12px', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((c, i) => {
                const grossProfit = c.totalRevenue - c.totalCogs;
                const grossMargin = c.totalRevenue > 0 ? (grossProfit / c.totalRevenue) * 100 : 0;
                return (
                  <tr key={c.clientName + i}
                    onClick={() => {
                      const full = clientRevenue.find(cr => cr.clientName === c.clientName && cr.businessUnit === c.businessUnit);
                      if (full) setSelectedClient(full);
                    }}
                    onMouseEnter={() => setHoveredRow(i)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      background: hoveredRow === i ? 'rgba(99,102,241,0.08)' : 'transparent',
                      transition: 'background 0.15s',
                    }}>
                    <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{c.clientName}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: BU_COLORS[c.businessUnit], color: '#fff', fontSize: 11 }}>
                        {BU_LABELS[c.businessUnit]}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#a5b4fc' }}>{fmtMoney(c.totalRevenue)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
                      {c.totalCogs === 0 ? <span style={{ color: '#64748b' }}>—</span> : fmtMoney(c.totalCogs)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: grossProfit >= 0 ? '#34d399' : '#f87171' }}>{fmtMoney(grossProfit)}</td>
                    {c.totalCogs === 0 ? (
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontSize: 11 }}>
                        原価未入力
                      </td>
                    ) : (
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                        color: grossMargin >= 30 ? '#34d399' : grossMargin >= 0 ? '#fbbf24' : '#f87171' }}>
                        {grossMargin.toFixed(1)}%
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredClients.length === 0 && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>データがありません</div>
          )}
        </div>
      </div>

      {/* Client detail modal */}
      {selectedClient && (() => {
        const c = selectedClient;
        const monthly = [...c.monthly].sort((a, b) => a.month.localeCompare(b.month));
        const totalRev = monthly.reduce((s, m) => s + m.revenue, 0);
        const totalCogs = monthly.reduce((s, m) => s + m.cogs, 0);
        const margin = totalRev > 0 ? ((totalRev - totalCogs) / totalRev) * 100 : 0;
        const share = grandTotal > 0
          ? ((clientStats.find(s => s.clientName === c.clientName && s.businessUnit === c.businessUnit)?.totalRevenue ?? 0) / grandTotal) * 100
          : 0;
        const clientInvoices = invoices.filter(inv => inv.clientName && (inv.clientName.includes(c.clientName) || c.clientName.includes(inv.clientName)));

        // 自動インサイト
        const insights: { text: string; color: string }[] = [];
        const last3 = monthly.slice(-3);
        if (last3.length >= 2) {
          const first = last3[0].revenue;
          const last = last3[last3.length - 1].revenue;
          const diff = first > 0 ? (last - first) / first : (last > 0 ? 1 : 0);
          if (diff > 0.1) insights.push({ text: `直近${last3.length}ヶ月の売上は増加傾向です（${fmtMoney(first)} → ${fmtMoney(last)}）`, color: '#4ade80' });
          else if (diff < -0.1) insights.push({ text: `直近${last3.length}ヶ月の売上は減少傾向です（${fmtMoney(first)} → ${fmtMoney(last)}）。フォローを検討してください`, color: '#fbbf24' });
          else insights.push({ text: `直近${last3.length}ヶ月の売上は横ばいです`, color: '#9ca3af' });
        }
        if (totalCogs > 0 && margin < 30) {
          insights.push({ text: `粗利率${margin.toFixed(1)}%と低採算です。単価や原価の見直し余地があります`, color: '#f87171' });
        }

        // ミニチャート
        const CW = 460, CH = 140, PAD = 10;
        const maxV = Math.max(...monthly.map(m => Math.max(m.revenue, m.cogs)), 1);
        const bw = monthly.length > 0 ? (CW - PAD * 2) / monthly.length : 0;

        return (
          <div onClick={() => setSelectedClient(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 24, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>{c.clientName}</h3>
                <span style={{ padding: '2px 8px', borderRadius: 4, background: BU_COLORS[c.businessUnit], color: '#fff', fontSize: 11 }}>
                  {BU_LABELS[c.businessUnit]}
                </span>
                <button onClick={() => setSelectedClient(null)}
                  style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#9ca3af', padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}>
                  ✕ 閉じる
                </button>
              </div>

              {/* KPI */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10 }}>
                  <div style={{ color: '#6b7280', fontSize: 11 }}>累計売上</div>
                  <div style={{ color: '#a5b4fc', fontSize: 15, fontWeight: 700 }}>{fmtMoney(totalRev)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10 }}>
                  <div style={{ color: '#6b7280', fontSize: 11 }}>累計原価</div>
                  <div style={{ color: '#9ca3af', fontSize: 15, fontWeight: 700 }}>{totalCogs === 0 ? '—' : fmtMoney(totalCogs)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10 }}>
                  <div style={{ color: '#6b7280', fontSize: 11 }}>粗利率</div>
                  {totalCogs === 0 ? (
                    <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600, marginTop: 3 }}>原価未入力</div>
                  ) : (
                    <div style={{ color: margin >= 30 ? '#4ade80' : margin >= 0 ? '#fbbf24' : '#f87171', fontSize: 15, fontWeight: 700 }}>{margin.toFixed(1)}%</div>
                  )}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10 }}>
                  <div style={{ color: '#6b7280', fontSize: 11 }}>売上構成比</div>
                  <div style={{ color: '#a5b4fc', fontSize: 15, fontWeight: 700 }}>{share.toFixed(1)}%</div>
                </div>
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ color: ins.color, fontSize: 12, lineHeight: 1.7 }}>• {ins.text}</div>
                  ))}
                </div>
              )}

              {/* Mini chart */}
              <h4 style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>月次売上/原価推移</h4>
              <div style={{ overflowX: 'auto', marginBottom: 6 }}>
                <svg width={CW} height={CH + 25} viewBox={`0 0 ${CW} ${CH + 25}`}>
                  {monthly.map((m, i) => {
                    const x = PAD + i * bw;
                    const revH = (m.revenue / maxV) * (CH - 20);
                    const cogsH = (m.cogs / maxV) * (CH - 20);
                    return (
                      <g key={m.month}>
                        <rect x={x + bw * 0.15} y={CH - revH} width={bw * 0.35} height={Math.max(revH, m.revenue > 0 ? 2 : 0)} fill="#6366f1" rx="2" />
                        <rect x={x + bw * 0.52} y={CH - cogsH} width={bw * 0.3} height={Math.max(cogsH, m.cogs > 0 ? 2 : 0)} fill="rgba(248,113,113,0.7)" rx="2" />
                        <text x={x + bw / 2} y={CH + 14} textAnchor="middle" fill="#6b7280" fontSize="8">{m.month.slice(2).replace('-', '/')}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <span style={{ color: '#9ca3af', fontSize: 11 }}><span style={{ display: 'inline-block', width: 9, height: 9, background: '#6366f1', borderRadius: 2, marginRight: 4 }} />売上</span>
                <span style={{ color: '#9ca3af', fontSize: 11 }}><span style={{ display: 'inline-block', width: 9, height: 9, background: 'rgba(248,113,113,0.7)', borderRadius: 2, marginRight: 4 }} />原価</span>
              </div>

              {/* Invoice history */}
              <h4 style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>請求書履歴</h4>
              {clientInvoices.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 12, padding: '8px 0' }}>請求書履歴なし</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['番号', '日付', '金額', 'ステータス'].map(h => (
                        <th key={h} style={{ textAlign: h === '番号' ? 'left' : 'right', color: '#6b7280', padding: '6px 8px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientInvoices.map(inv => {
                      const st = INV_STATUS_LABELS[inv.status] ?? { label: inv.status, color: '#9ca3af' };
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '6px 8px', color: '#e2e8f0' }}>{inv.invoiceNumber}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9ca3af' }}>{inv.issueDate}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: '#a5b4fc' }}>{fmtMoney(inv.total)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: st.color }}>{st.label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
