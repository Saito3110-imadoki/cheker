'use client';

import { useState, useEffect, useRef } from 'react';
import { members as defaultMembers, chatMessages, ChatMessage } from '@/lib/data';
import { Member } from '@/lib/data';

const departments = ['全体', '経営', 'マーケティング戦略', 'クリエイティブ', 'デジタル広告', 'データ分析', '営業', 'PR・広報', 'カスタマーサクセス'];

const QUICK_PROMPTS = [
  '今週の優先タスクを教えて',
  '新規クライアント獲得の戦略を提案して',
  'SNSキャンペーンのアイデアを出して',
  '競合分析をお願いしたい',
  '今月の広告ROASを改善するには？',
];

export default function OfficePage() {
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages);
  const [input, setInput] = useState('');
  const [selectedDept, setSelectedDept] = useState('全体');
  const [sending, setSending] = useState(false);
  const [mentionId, setMentionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = () => {
      try {
        const s = localStorage.getItem('imadoki-members');
        if (s) setMembers(JSON.parse(s));
      } catch { /* ignore */ }
    };
    load();
    window.addEventListener('imadoki-members-updated', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('imadoki-members-updated', load);
      window.removeEventListener('storage', load);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onlineMembers = members.filter(m => m.status === 'online' || m.status === 'busy');
  const aiMembers = onlineMembers.filter(m => m.isAI);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    setInput('');

    const userMember = members.find(m => m.id === 'ceo') ?? members.find(m => !m.isAI);

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      from: userMember?.id ?? 'ceo',
      content: text,
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      isAI: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setSending(true);

    const pool = aiMembers.length > 0 ? aiMembers : members.filter(m => m.isAI);
    const responder = mentionId
      ? (members.find(m => m.id === mentionId) ?? pool[Math.floor(Math.random() * pool.length)])
      : pool[Math.floor(Math.random() * pool.length)];
    setMentionId(null);

    if (!responder) { setSending(false); return; }

    const aiMsgId = `m-${Date.now()}-ai`;
    setMessages(prev => [...prev, {
      id: aiMsgId,
      from: responder.id,
      content: '',
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      isAI: true,
    }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          agentId: responder.id,
          context: `チャンネル: #${selectedDept} / 役職: ${responder.role} / 部署: ${responder.department}`,
        }),
      });

      if (!res.ok || !res.body) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: accumulated } : m));
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? { ...m, content: '申し訳ありません。現在応答できません。' } : m
      ));
    }
    setSending(false);
  };

  const handleMention = (member: Member) => {
    setMentionId(member.id);
    setInput(`@${member.name} `);
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">🏢 バーチャルオフィス</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>AIチームとリアルタイムでコミュニケーション</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          <span className="text-xs" style={{ color: '#4ade80' }}>{onlineMembers.length}名オンライン</span>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Members panel */}
        <div className="w-52 flex-shrink-0 glass rounded-xl flex flex-col">
          <div className="px-4 py-3 border-b text-xs font-semibold text-white" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            メンバー ({onlineMembers.length})
          </div>
          <div className="p-2 overflow-y-auto flex-1 space-y-0.5">
            {aiMembers.length > 0 && (
              <div className="mb-2">
                <div className="text-xs px-2 py-1" style={{ color: '#4b5563' }}>— AI —</div>
                {aiMembers.map(m => (
                  <button key={m.id} onClick={() => handleMention(m)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all hover:bg-white/5 group"
                    title={`@${m.name} にメンション`}>
                    <div className="relative flex-shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: 'rgba(99,102,241,0.15)' }}>
                        {m.avatar}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-gray-900"
                        style={{ background: m.status === 'online' ? '#22c55e' : '#f59e0b', boxShadow: m.status === 'online' ? '0 0 4px #22c55e' : 'none' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-white truncate">{m.name}</div>
                      <div className="truncate" style={{ color: '#6b7280', fontSize: '10px' }}>{m.role.split('/')[0]}</div>
                    </div>
                    <span className="text-xs opacity-0 group-hover:opacity-100 flex-shrink-0" style={{ color: '#6366f1' }}>@</span>
                  </button>
                ))}
              </div>
            )}
            {onlineMembers.filter(m => !m.isAI).length > 0 && (
              <div>
                <div className="text-xs px-2 py-1" style={{ color: '#4b5563' }}>— スタッフ —</div>
                {onlineMembers.filter(m => !m.isAI).map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                    <div className="relative flex-shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: 'rgba(168,85,247,0.15)' }}>
                        {m.avatar}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-gray-900"
                        style={{ background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-white truncate">{m.name}</div>
                      <div className="truncate" style={{ color: '#6b7280', fontSize: '10px' }}>{m.role.split('/')[0]}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col glass rounded-xl min-w-0">
          {/* Channel tabs */}
          <div className="flex-shrink-0 border-b px-3 pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex gap-1 overflow-x-auto pb-3">
              {departments.map(d => (
                <button key={d} onClick={() => setSelectedDept(d)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                  style={{
                    background: selectedDept === d ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    color: selectedDept === d ? '#a5b4fc' : '#6b7280',
                    border: `1px solid ${selectedDept === d ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                  }}>
                  #{d}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => {
              const member = members.find(m => m.id === msg.from);
              return (
                <div key={msg.id} className="flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: msg.isAI ? 'rgba(99,102,241,0.12)' : 'rgba(168,85,247,0.12)' }}>
                    {member?.avatar || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{member?.name || 'User'}</span>
                      {msg.isAI && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>AI</span>}
                      <span className="text-xs ml-1" style={{ color: '#6b7280' }}>{msg.time}</span>
                    </div>
                    <div className="text-sm leading-relaxed rounded-xl px-3 py-2 inline-block max-w-xl whitespace-pre-wrap"
                      style={{
                        background: msg.isAI ? 'rgba(99,102,241,0.08)' : 'rgba(168,85,247,0.08)',
                        color: '#d1d5db',
                        border: `1px solid ${msg.isAI ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.15)'}`,
                      }}>
                      {msg.content || <span className="animate-pulse">▌</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="flex-shrink-0 px-4 pt-2 flex gap-2 overflow-x-auto pb-1">
            {QUICK_PROMPTS.map(q => (
              <button key={q} onClick={() => handleSend(q)} disabled={sending}
                className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 transition-all hover:opacity-80"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)', opacity: sending ? 0.5 : 1 }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {mentionId && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                <span>@{members.find(m => m.id === mentionId)?.name} にメンション中</span>
                <button onClick={() => { setMentionId(null); setInput(''); }} className="ml-auto text-gray-500 hover:text-gray-300">✕</button>
              </div>
            )}
            <div className="flex gap-3">
              <input ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !sending && handleSend()}
                placeholder="AIチームにメッセージを送信... (Enterで送信)"
                disabled={sending}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button onClick={() => handleSend()} disabled={sending || !input.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                style={{
                  background: sending || !input.trim() ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                  opacity: sending || !input.trim() ? 0.7 : 1,
                }}>
                {sending ? '⏳' : '送信'}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
              💡 左のメンバー名をクリックして特定のAIに話しかけることができます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
