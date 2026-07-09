'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { CompanyData, ClientRevenue } from '@/lib/ceo-types';

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

function filterMonths(months: string[], period: Period, customFrom: string, customTo: string): string[] {
  const now = new Date();
  const thisYear = now.getFullYear();
  return months.filter(m => {
    if (period === 'all') return true;
    if (period === 'thisYear') return m.startsWith(String(thisYear));
    if (period === 'Q1') return ['01','02','03'].includes(m.slice(5,7));
    if (period === 'Q2') return ['04','05','06'].includes(m.slice(5,7));
    if (period === 'Q3') return ['07','08','09'].includes(m.slice(5,7));
    if (period === 'Q4') return ['10','11','12'].includes(m.slice(5,7));
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('imadoki-company-data');
      if (raw) setData(JSON.parse(raw));
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
        <h1 style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>アナリティクス</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>クライアント別・事業部別売上分析</p>
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
            {p === 'all' ? '全期間' : p === 'thisYear' ? '今期' : p}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 20 }}>
        <div style={glassStyle}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>総売上</div>
          <div style={{ color: '#a5b4fc', fontSize: 22, fontWeight: 700 }}>{fmtMoney(grandTotal)}</div>
        </div>
        <div style={glassStyle}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>クライアント数</div>
          <div style={{ color: '#a5b4fc', fontSize: 22, fontWeight: 700 }}>{clientStats.length}</div>
        </div>
        <div style={{ ...glassStyle, borderColor: top3Share > 50 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)' }}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>Top3集中度</div>
          <div style={{ color: top3Share > 50 ? '#f87171' : '#a5b4fc', fontSize: 22, fontWeight: 700 }}>{top3Share.toFixed(1)}%</div>
          {top3Share > 50 && <div style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>⚠ 売上集中リスク（50%超）</div>}
        </div>
      </div>

      {/* Bar chart + Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 20 }}>
        {/* Top10 bar chart */}
        <div style={glassStyle}>
          <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>クライアント別売上ランキング TOP10</h3>
          <svg width="100%" viewBox={`0 0 500 ${top10.length * 36 + 10}`}>
            {top10.map((c, i) => {
              const barW = (c.totalRevenue / maxBarRevenue) * 340;
              const y = i * 36 + 4;
              return (
                <g key={c.clientName}>
                  <text x="0" y={y + 14} fill="#9ca3af" fontSize="11">{i + 1}.</text>
                  <text x="18" y={y + 14} fill="#e2e8f0" fontSize="11" style={{ fontWeight: 500 }}>{c.clientName.slice(0, 14)}</text>
                  <rect x="150" y={y + 2} width={barW} height={20} rx="4" fill={BU_COLORS[c.businessUnit] ?? 'rgba(99,102,241,0.6)'} />
                  <text x={154 + barW} y={y + 15} fill="#a5b4fc" fontSize="11">{fmtMoney(c.totalRevenue)}</text>
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
                  <tr key={c.clientName + i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{c.clientName}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: BU_COLORS[c.businessUnit], color: '#fff', fontSize: 11 }}>
                        {BU_LABELS[c.businessUnit]}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#a5b4fc' }}>{fmtMoney(c.totalRevenue)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#9ca3af' }}>{fmtMoney(c.totalCogs)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: grossProfit >= 0 ? '#34d399' : '#f87171' }}>{fmtMoney(grossProfit)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: grossMargin >= 30 ? '#34d399' : grossMargin >= 0 ? '#fbbf24' : '#f87171' }}>
                      {grossMargin.toFixed(1)}%
                    </td>
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
    </div>
  );
}
