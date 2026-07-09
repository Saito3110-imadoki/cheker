'use client';

import { useState, useEffect, useRef } from 'react';

// ────────────────────────── Types ──────────────────────────

type DocType = 'invoice' | 'contractor' | 'contract';
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  docType: DocType;
  status: InvoiceStatus;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  legalCheckResult?: string;
  createdAt: string;
}

// ────────────────────────── Constants ──────────────────────────

const DOC_LABELS: Record<DocType, string> = {
  invoice: '請求書',
  contractor: '業務委託請求書',
  contract: '業務委託契約書',
};

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft:   { label: '下書き', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  sent:    { label: '送付済', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  paid:    { label: '入金済', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  overdue: { label: '期限超過', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
};

const TAX_RATE = 0.1;
const STORAGE_KEY = 'imadoki-invoices';

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 20,
};

// ────────────────────────── Helpers ──────────────────────────

function generateInvoiceNumber(docType: DocType, existing: Invoice[]): string {
  const prefix = docType === 'invoice' ? 'INV' : docType === 'contractor' ? 'CTR' : 'CON';
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const seq = (existing.filter(i => i.docType === docType).length + 1).toString().padStart(3, '0');
  return `${prefix}-${year}${month}-${seq}`;
}

function loadInvoices(): Invoice[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveInvoices(invoices: Invoice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  // Sync revenue from paid invoices
  syncRevenueFromInvoices(invoices);
  window.dispatchEvent(new Event('imadoki-invoices-updated'));
}

function syncRevenueFromInvoices(invoices: Invoice[]) {
  try {
    const data = JSON.parse(localStorage.getItem('imadoki-company-data') || 'null');
    if (!data) return;

    const paid = invoices.filter(i => i.status === 'paid' && i.docType !== 'contract');
    const monthMap: Record<string, number> = {};
    paid.forEach(inv => {
      const month = inv.dueDate?.slice(0, 7) || inv.issueDate?.slice(0, 7);
      if (month) monthMap[month] = (monthMap[month] || 0) + inv.subtotal;
    });

    const existing: { month: string; revenue: number; cogs: number; profit: number; profitRate: number }[] =
      data.monthlyPL ?? [];

    Object.entries(monthMap).forEach(([month, revenue]) => {
      const idx = existing.findIndex(r => r.month === month);
      if (idx >= 0) {
        existing[idx].revenue = Math.max(existing[idx].revenue, revenue);
        existing[idx].profit = existing[idx].revenue - existing[idx].cogs;
        existing[idx].profitRate = existing[idx].revenue > 0
          ? (existing[idx].profit / existing[idx].revenue) * 100 : 0;
      }
    });

    data.monthlyPL = existing;
    localStorage.setItem('imadoki-company-data', JSON.stringify(data));
  } catch { /* ignore */ }
}

// ────────────────────────── Sub-components ──────────────────────────

function Badge({ status }: { status: InvoiceStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

function formatMoney(n: number) {
  return '¥' + n.toLocaleString('ja-JP');
}

// ────────────────────────── Invoice Form ──────────────────────────

function InvoiceForm({ initial, onSave, onCancel }: {
  initial?: Partial<Invoice>;
  onSave: (inv: Invoice) => void;
  onCancel: () => void;
}) {
  const [docType, setDocType] = useState<DocType>(initial?.docType ?? 'invoice');
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [clientAddress, setClientAddress] = useState(initial?.clientAddress ?? '');
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [items, setItems] = useState<InvoiceItem[]>(
    initial?.items ?? [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }]
  );
  const invoicesRef = useRef<Invoice[]>([]);

  useEffect(() => { invoicesRef.current = loadInvoices(); }, []);

  const updateItem = (idx: number, field: keyof InvoiceItem, val: string | number) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      if (field === 'quantity' || field === 'unitPrice') {
        next[idx].amount = Number(next[idx].quantity) * Number(next[idx].unitPrice);
      }
      return next;
    });
  };

  const addItem = () => setItems(p => [...p, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const tax = Math.floor(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const handleSave = (status: InvoiceStatus = 'draft') => {
    const existing = loadInvoices();
    const inv: Invoice = {
      id: initial?.id ?? crypto.randomUUID(),
      docType,
      status,
      invoiceNumber: initial?.invoiceNumber ?? generateInvoiceNumber(docType, existing),
      issueDate,
      dueDate,
      clientName,
      clientAddress,
      items,
      subtotal,
      tax,
      total,
      notes,
      legalCheckResult: initial?.legalCheckResult,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    onSave(inv);
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: '#e2e8f0', padding: '6px 10px', width: '100%', fontSize: 13,
  };
  const labelStyle: React.CSSProperties = { color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' };

  return (
    <div style={{ ...glass, maxWidth: 800 }}>
      <h2 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
        {initial?.id ? '書類を編集' : '新規書類作成'}
      </h2>

      {/* Doc type */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(Object.keys(DOC_LABELS) as DocType[]).map(t => (
          <button key={t} onClick={() => setDocType(t)}
            style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: docType === t ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
              border: docType === t ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
              color: docType === t ? '#a5b4fc' : '#94a3b8',
            }}>{DOC_LABELS[t]}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>取引先名 *</label>
          <input style={inputStyle} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="株式会社〇〇" />
        </div>
        <div>
          <label style={labelStyle}>取引先住所</label>
          <input style={inputStyle} value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="東京都〇〇区..." />
        </div>
        <div>
          <label style={labelStyle}>発行日 *</label>
          <input type="date" style={inputStyle} value={issueDate} onChange={e => setIssueDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>支払期日</label>
          <input type="date" style={inputStyle} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      {/* Line items */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>明細</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11 }}>
              <th style={{ textAlign: 'left', paddingBottom: 6, width: '45%' }}>品目・サービス</th>
              <th style={{ textAlign: 'right', paddingBottom: 6, width: '12%' }}>数量</th>
              <th style={{ textAlign: 'right', paddingBottom: 6, width: '20%' }}>単価</th>
              <th style={{ textAlign: 'right', paddingBottom: 6, width: '18%' }}>金額</th>
              <th style={{ width: '5%' }} />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ paddingBottom: 6, paddingRight: 8 }}>
                  <input style={inputStyle} value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    placeholder="サービス内容" />
                </td>
                <td style={{ paddingBottom: 6, paddingRight: 8 }}>
                  <input type="number" style={{ ...inputStyle, textAlign: 'right' }}
                    value={item.quantity} min={1}
                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                </td>
                <td style={{ paddingBottom: 6, paddingRight: 8 }}>
                  <input type="number" style={{ ...inputStyle, textAlign: 'right' }}
                    value={item.unitPrice} min={0}
                    onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))} />
                </td>
                <td style={{ paddingBottom: 6, paddingRight: 8, textAlign: 'right', color: '#e2e8f0' }}>
                  {formatMoney(item.amount)}
                </td>
                <td style={{ paddingBottom: 6 }}>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addItem}
          style={{ marginTop: 8, background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.3)',
            borderRadius: 6, color: '#818cf8', padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}>
          + 行を追加
        </button>
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{ minWidth: 240 }}>
          {[
            ['小計', formatMoney(subtotal)],
            [`消費税（${(TAX_RATE * 100).toFixed(0)}%）`, formatMoney(tax)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
              fontSize: 13, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span>{k}</span><span>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0',
            fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
            <span>合計</span><span>{formatMoney(total)}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>備考</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 } as React.CSSProperties}
          value={notes} onChange={e => setNotes(e.target.value)} placeholder="振込先・備考など" />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel}
          style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
          キャンセル
        </button>
        <button onClick={() => handleSave('draft')}
          style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
          下書き保存
        </button>
        <button onClick={() => handleSave('sent')}
          style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', color: '#fff', fontWeight: 600 }}>
          送付済として保存
        </button>
      </div>
    </div>
  );
}

// ────────────────────────── Legal Check Panel ──────────────────────────

function LegalCheckPanel({ invoice, onDone }: { invoice: Invoice; onDone: (result: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(invoice.legalCheckResult ?? '');
  const [error, setError] = useState('');

  const buildContent = () => {
    const lines = [
      `${DOC_LABELS[invoice.docType]}`,
      `発行日: ${invoice.issueDate}`,
      `取引先: ${invoice.clientName}${invoice.clientAddress ? ` (${invoice.clientAddress})` : ''}`,
      `支払期日: ${invoice.dueDate || '記載なし'}`,
      '',
      '【明細】',
      ...invoice.items.map(i => `- ${i.description}: ${i.quantity}個 × ¥${i.unitPrice.toLocaleString()} = ¥${i.amount.toLocaleString()}`),
      '',
      `小計: ¥${invoice.subtotal.toLocaleString()}`,
      `消費税: ¥${invoice.tax.toLocaleString()}`,
      `合計: ¥${invoice.total.toLocaleString()}`,
      ...(invoice.notes ? ['', '備考:', invoice.notes] : []),
    ];
    return lines.join('\n');
  };

  const run = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/legal-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: buildContent(), docType: invoice.docType }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResult(json.result);
      onDone(json.result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally { setLoading(false); }
  };

  return (
    <div style={glass}>
      <h3 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
        AIリーガルチェック — {DOC_LABELS[invoice.docType]} #{invoice.invoiceNumber}
      </h3>
      {!result ? (
        <div>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
            Claude claude-opus-4-8 が日本法に基づいて書類をレビューします。必須記載事項、リスク箇所、修正提案を提示します。
          </p>
          {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button onClick={run} disabled={loading}
            style={{ padding: '10px 24px', borderRadius: 8, fontSize: 14, cursor: loading ? 'wait' : 'pointer',
              background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', color: '#fff', fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ 分析中...' : '🔍 リーガルチェック実行'}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16,
            color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto' }}>
            {result}
          </div>
          <button onClick={run} disabled={loading}
            style={{ marginTop: 12, padding: '6px 16px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            {loading ? '再実行中...' : '再チェック'}
          </button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────── Invoice Preview (print layout) ──────────────────────────

function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const company = { name: '株式会社IMADOKI', address: '東京都〇〇区', regNum: 'T0000000000000' };

  return (
    <div style={{ background: '#fff', color: '#111', borderRadius: 8, padding: 40, maxWidth: 700,
      fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: 4 }}>{DOC_LABELS[invoice.docType]}</h1>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>No. {invoice.invoiceNumber}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>{company.name}</div>
          <div style={{ color: '#555' }}>{company.address}</div>
          <div style={{ color: '#555' }}>登録番号: {company.regNum}</div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{invoice.clientName} 御中</div>
        {invoice.clientAddress && <div style={{ color: '#555', fontSize: 13 }}>{invoice.clientAddress}</div>}
      </div>

      <div style={{ display: 'flex', gap: 32, marginBottom: 24, fontSize: 13 }}>
        <div><span style={{ color: '#666' }}>発行日: </span>{invoice.issueDate}</div>
        {invoice.dueDate && <div><span style={{ color: '#666' }}>お支払期限: </span>{invoice.dueDate}</div>}
      </div>

      <div style={{ border: '2px solid #6366f1', borderRadius: 4, padding: '8px 16px', marginBottom: 24,
        display: 'inline-block', fontSize: 13 }}>
        <span style={{ color: '#666' }}>ご請求金額: </span>
        <span style={{ fontWeight: 700, fontSize: 20, color: '#6366f1' }}>{formatMoney(invoice.total)}</span>
        <span style={{ color: '#666', fontSize: 12 }}>（税込）</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8f8f8', borderBottom: '2px solid #e5e7eb' }}>
            {['品目・サービス', '数量', '単価', '金額'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: h === '品目・サービス' ? 'left' : 'right',
                fontWeight: 600, color: '#374151' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '7px 12px' }}>{item.description}</td>
              <td style={{ padding: '7px 12px', textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ padding: '7px 12px', textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
              <td style={{ padding: '7px 12px', textAlign: 'right' }}>{formatMoney(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ minWidth: 220, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#555' }}>
            <span>小計</span><span>{formatMoney(invoice.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#555', borderBottom: '1px solid #e5e7eb' }}>
            <span>消費税（10%）</span><span>{formatMoney(invoice.tax)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: 700, fontSize: 15 }}>
            <span>合計（税込）</span><span>{formatMoney(invoice.total)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: 12, fontSize: 13, color: '#555' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>備考</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{invoice.notes}</div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────── Main Page ──────────────────────────

type Tab = 'list' | 'create' | 'preview' | 'legal';

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tab, setTab] = useState<Tab>('list');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [filterType, setFilterType] = useState<DocType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');

  useEffect(() => {
    setInvoices(loadInvoices());
    const handler = () => setInvoices(loadInvoices());
    window.addEventListener('imadoki-invoices-updated', handler);
    return () => window.removeEventListener('imadoki-invoices-updated', handler);
  }, []);

  const save = (inv: Invoice) => {
    const existing = loadInvoices();
    const idx = existing.findIndex(i => i.id === inv.id);
    if (idx >= 0) existing[idx] = inv;
    else existing.unshift(inv);
    saveInvoices(existing);
    setInvoices(existing);
    setSelected(inv);
    setTab('list');
  };

  const updateStatus = (id: string, status: InvoiceStatus) => {
    const updated = invoices.map(i => i.id === id ? { ...i, status } : i);
    saveInvoices(updated);
    setInvoices(updated);
  };

  const deleteInvoice = (id: string) => {
    if (!confirm('削除しますか？')) return;
    const updated = invoices.filter(i => i.id !== id);
    saveInvoices(updated);
    setInvoices(updated);
  };

  const filtered = invoices.filter(i =>
    (filterType === 'all' || i.docType === filterType) &&
    (filterStatus === 'all' || i.status === filterStatus)
  );

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.subtotal, 0);
  const totalSent = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0);
  const totalDraft = invoices.filter(i => i.status === 'draft').length;

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: tab === t ? 'rgba(99,102,241,0.2)' : 'transparent',
    border: tab === t ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
    color: tab === t ? '#a5b4fc' : '#64748b',
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: 0 }}>💰 財務・書類管理</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>請求書・業務委託請求書・契約書の作成とAIリーガルチェック</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '入金済（税抜）', value: formatMoney(totalPaid), color: '#4ade80' },
          { label: '請求中（税込）', value: formatMoney(totalSent), color: '#60a5fa' },
          { label: '下書き', value: `${totalDraft}件`, color: '#94a3b8' },
        ].map(c => (
          <div key={c.label} style={{ ...glass, textAlign: 'center' }}>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>{c.label}</div>
            <div style={{ color: c.color, fontSize: 20, fontWeight: 700 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('list')} onClick={() => setTab('list')}>📋 書類一覧</button>
        <button style={tabStyle('create')} onClick={() => { setSelected(null); setTab('create'); }}>✏️ 新規作成</button>
        {selected && <button style={tabStyle('preview')} onClick={() => setTab('preview')}>👁 プレビュー</button>}
        {selected && <button style={tabStyle('legal')} onClick={() => setTab('legal')}>⚖️ リーガルチェック</button>}
      </div>

      {/* List */}
      {tab === 'list' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={filterType} onChange={e => setFilterType(e.target.value as DocType | 'all')}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, color: '#e2e8f0', padding: '5px 10px', fontSize: 13 }}>
              <option value="all">すべての書類</option>
              {(Object.keys(DOC_LABELS) as DocType[]).map(t => (
                <option key={t} value={t}>{DOC_LABELS[t]}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as InvoiceStatus | 'all')}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, color: '#e2e8f0', padding: '5px 10px', fontSize: 13 }}>
              <option value="all">すべてのステータス</option>
              {(Object.keys(STATUS_CONFIG) as InvoiceStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            <button onClick={() => { setSelected(null); setTab('create'); }}
              style={{ marginLeft: 'auto', padding: '6px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', color: '#fff', fontWeight: 600 }}>
              + 新規作成
            </button>
          </div>

          {filtered.length === 0 ? (
            <div style={{ ...glass, textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>書類がありません</div>
              <button onClick={() => setTab('create')}
                style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                最初の書類を作成
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(inv => (
                <div key={inv.id} style={{ ...glass, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{inv.clientName}</span>
                      <Badge status={inv.status} />
                      <span style={{ color: '#64748b', fontSize: 11, padding: '1px 7px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {DOC_LABELS[inv.docType]}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {inv.invoiceNumber} · 発行: {inv.issueDate}
                      {inv.dueDate && ` · 期日: ${inv.dueDate}`}
                    </div>
                  </div>
                  <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    {formatMoney(inv.total)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {inv.status === 'sent' && (
                      <button onClick={() => updateStatus(inv.id, 'paid')}
                        style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                          background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                        入金済
                      </button>
                    )}
                    <button onClick={() => { setSelected(inv); setTab('preview'); }}
                      style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                      表示
                    </button>
                    <button onClick={() => { setSelected(inv); setTab('legal'); }}
                      style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#c084fc' }}>
                      ⚖️
                    </button>
                    <button onClick={() => { setSelected(inv); setTab('create'); }}
                      style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                      編集
                    </button>
                    <button onClick={() => deleteInvoice(inv.id)}
                      style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit */}
      {tab === 'create' && (
        <InvoiceForm
          initial={selected ?? undefined}
          onSave={save}
          onCancel={() => setTab('list')}
        />
      )}

      {/* Preview */}
      {tab === 'preview' && selected && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
            <button onClick={() => window.print()}
              style={{ padding: '7px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
              🖨️ 印刷 / PDF出力
            </button>
          </div>
          <InvoicePreview invoice={selected} />
        </div>
      )}

      {/* Legal check */}
      {tab === 'legal' && selected && (
        <LegalCheckPanel
          invoice={selected}
          onDone={result => {
            const updated = invoices.map(i => i.id === selected.id ? { ...i, legalCheckResult: result } : i);
            saveInvoices(updated);
            setInvoices(updated);
            setSelected({ ...selected, legalCheckResult: result });
          }}
        />
      )}
    </div>
  );
}
