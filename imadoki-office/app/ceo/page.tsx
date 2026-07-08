'use client';

import { useState } from 'react';

const categories = [
  {
    id: 'sales',
    icon: '💼',
    label: '営業',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.1)',
    border: 'rgba(6,182,212,0.3)',
    suggestions: [
      '新規クライアントへの提案書を作ってほしい（SNS広告運用代行・月30万）',
      '既存クライアントへのアップセル提案を考えてほしい',
      '失注しそうな案件をどうクロージングすべきか',
      '今月の営業優先順位を教えてほしい',
    ],
  },
  {
    id: 'marketing',
    icon: '📣',
    label: 'マーケ',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.1)',
    border: 'rgba(168,85,247,0.3)',
    suggestions: [
      '今月のSNS広告予算20万円の最適な配分を教えてほしい',
      'Instagram広告のROASが下がっている。改善策は？',
      '新しいクリエイティブの方向性を提案してほしい',
      'TikTok広告を始めるべきか判断してほしい',
    ],
  },
  {
    id: 'hiring',
    icon: '🤝',
    label: '採用',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.15)',
    suggestions: [
      'SNS広告運用ができる業務委託を採用したい。単価の相場は？',
      'WEBデザイナーを業務委託で採用する際の注意点は？',
      '業務委託と正社員、今の規模ではどちらが良いか',
      '採用コストを抑えながら即戦力を確保する方法は？',
    ],
  },
  {
    id: 'finance',
    icon: '💰',
    label: '財務',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    suggestions: [
      '今月の売上150万円。どこにコストをかけるべきか',
      'キャッシュフローを改善するために何をすべきか',
      '売上200万円を達成するための戦略を教えてほしい',
      '業務委託費・広告費・その他経費の適正比率は？',
    ],
  },
];

type Message = { role: 'user' | 'ai'; content: string };

export default function CeoPage() {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [decisions, setDecisions] = useState<{ category: string; summary: string; time: string }[]>([]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: msg }]);

    const aiMsgIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
      const res = await fetch('/api/ceo-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, category: activeCategory.id }),
      });

      if (!res.ok || !res.body) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map((m, i) => i === aiMsgIndex ? { ...m, content: accumulated } : m));
      }

      const summary = msg.length > 30 ? msg.slice(0, 30) + '...' : msg;
      setDecisions(prev => [{
        category: activeCategory.label,
        summary,
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      }, ...prev.slice(0, 4)]);
    } catch {
      setMessages(prev => prev.map((m, i) => i === aiMsgIndex ? { ...m, content: 'エラーが発生しました。もう一度お試しください。' } : m));
    }

    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">👔 社長室</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>AIアドバイザーと意思決定を行うプライベートコンソール</p>
      </div>

      {/* Category selector */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat); setMessages([]); }}
            className="glass rounded-xl p-4 text-center transition-all"
            style={{
              border: activeCategory.id === cat.id ? `1px solid ${cat.border}` : '1px solid rgba(255,255,255,0.06)',
              background: activeCategory.id === cat.id ? cat.bg : 'rgba(255,255,255,0.02)',
            }}
          >
            <div className="text-2xl mb-1">{cat.icon}</div>
            <div className="text-sm font-semibold" style={{ color: activeCategory.id === cat.id ? cat.color : '#9ca3af' }}>
              {cat.label}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chat area */}
        <div className="lg:col-span-3 glass rounded-xl flex flex-col" style={{ minHeight: '520px' }}>
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="text-2xl">{activeCategory.icon}</div>
            <div>
              <div className="text-sm font-bold text-white">{activeCategory.label}AIアドバイザー</div>
              <div className="text-xs" style={{ color: '#6b7280' }}>社長専用・意思決定サポート</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: activeCategory.color, boxShadow: `0 0 6px ${activeCategory.color}` }} />
              <span className="text-xs" style={{ color: activeCategory.color }}>稼働中</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '340px' }}>
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-8">
                <div className="text-4xl mb-3">{activeCategory.icon}</div>
                <p className="text-sm mb-5" style={{ color: '#6b7280' }}>
                  {activeCategory.label}に関する質問・相談を入力してください
                </p>
                <div className="w-full space-y-2">
                  {activeCategory.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="w-full text-left text-xs px-3 py-2.5 rounded-lg transition-all"
                      style={{
                        background: activeCategory.bg,
                        border: `1px solid ${activeCategory.border}`,
                        color: '#d1d5db',
                      }}
                    >
                      💬 {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: activeCategory.bg }}>
                    {activeCategory.icon}
                  </div>
                )}
                <div
                  className="text-sm leading-relaxed rounded-xl px-4 py-3 max-w-lg"
                  style={{
                    background: msg.role === 'user' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    border: msg.role === 'user' ? '1px solid rgba(99,102,241,0.3)' : `1px solid ${activeCategory.border}`,
                    color: '#d1d5db',
                  }}
                >
                  {msg.content || (msg.role === 'ai' && loading ? '考え中...' : '')}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.15)' }}>
                    👩‍💼
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSend()}
                placeholder={`${activeCategory.label}について社長として判断したいことを入力...`}
                disabled={loading}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                style={{
                  background: loading ? 'rgba(99,102,241,0.3)' : `linear-gradient(135deg, ${activeCategory.color}, #6366f1)`,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? '⏳' : '判断する'}
              </button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* CEO card */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(168,85,247,0.15)' }}>👩‍💼</div>
              <div>
                <div className="text-sm font-bold text-white">今時 花子</div>
                <div className="text-xs" style={{ color: '#a78bfa' }}>代表取締役社長</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)' }}>
              <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 5px #4ade80' }} />
              <span className="text-xs text-green-400">意思決定モード</span>
            </div>
          </div>

          {/* Recent decisions */}
          <div className="glass rounded-xl p-4">
            <div className="text-xs font-semibold text-white mb-3">📋 最近の相談履歴</div>
            {decisions.length === 0 ? (
              <p className="text-xs" style={{ color: '#4b5563' }}>まだ相談がありません</p>
            ) : (
              <div className="space-y-2">
                {decisions.map((d, i) => (
                  <div key={i} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs px-1.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{d.category}</span>
                      <span className="text-xs ml-auto" style={{ color: '#374151' }}>{d.time}</span>
                    </div>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>{d.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
