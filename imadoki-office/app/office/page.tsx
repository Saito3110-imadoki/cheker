'use client';

import { useState } from 'react';
import { members, chatMessages, ChatMessage } from '@/lib/data';

const departments = ['全体', '経営', 'マーケティング戦略', 'クリエイティブ', 'デジタル広告', 'データ分析', '営業', 'PR・広報', 'カスタマーサクセス'];

export default function OfficePage() {
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages);
  const [input, setInput] = useState('');
  const [selectedDept, setSelectedDept] = useState('全体');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userText = input;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      from: 'ceo',
      content: userText,
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      isAI: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setSending(true);

    const onlineAI = members.filter(m => m.isAI && (m.status === 'online' || m.status === 'busy'));
    const aiResponder = onlineAI[Math.floor(Math.random() * onlineAI.length)];
    const aiMsgId = `m-${Date.now()}-ai`;
    const aiTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, {
      id: aiMsgId,
      from: aiResponder.id,
      content: '...',
      time: aiTime,
      isAI: true,
    }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          agentId: aiResponder.id,
          context: `チャンネル: ${selectedDept}チャンネル, 役職: ${aiResponder.role}`,
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
        m.id === aiMsgId ? { ...m, content: '申し訳ありません。現在応答できません。しばらくしてからお試しください。' } : m
      ));
    }

    setSending(false);
  };

  const onlineMembers = members.filter(m => m.status === 'online' || m.status === 'busy');

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-5 flex-shrink-0">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">🏢 バーチャルオフィス</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>AIチームとリアルタイムでコミュニケーション</p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Members panel */}
        <div className="w-56 flex-shrink-0 glass rounded-xl p-4 flex flex-col">
          <div className="text-xs font-semibold text-white mb-3">オンラインメンバー ({onlineMembers.length})</div>
          <div className="space-y-2 overflow-y-auto flex-1">
            {onlineMembers.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                    style={{ background: m.isAI ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.15)' }}>
                    {m.avatar}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-900"
                    style={{
                      background: m.status === 'online' ? '#22c55e' : '#f59e0b',
                      boxShadow: m.status === 'online' ? '0 0 5px #22c55e' : 'none',
                    }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white truncate">{m.name}</div>
                  <div className="text-xs truncate" style={{ color: '#6b7280' }}>{m.role.split('/')[0]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col glass rounded-xl min-w-0">
          {/* Channel tabs */}
          <div className="flex-shrink-0 border-b p-3 overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex gap-2">
              {departments.slice(0, 5).map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDept(d)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                  style={{
                    background: selectedDept === d ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    color: selectedDept === d ? '#a5b4fc' : '#6b7280',
                    border: `1px solid ${selectedDept === d ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                  }}
                >
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
                <div key={msg.id} className="flex gap-3 items-start animate-fade-up">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: msg.isAI ? 'rgba(99,102,241,0.12)' : 'rgba(168,85,247,0.12)' }}>
                    {member?.avatar || '👤'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{member?.name || 'User'}</span>
                      {msg.isAI && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>AI</span>
                      )}
                      <span className="text-xs" style={{ color: '#374151' }}>{msg.time}</span>
                    </div>
                    <div
                      className="text-sm leading-relaxed rounded-lg px-3 py-2 inline-block max-w-xl"
                      style={{
                        background: msg.isAI ? 'rgba(99,102,241,0.08)' : 'rgba(168,85,247,0.08)',
                        color: '#d1d5db',
                        border: `1px solid ${msg.isAI ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.15)'}`,
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !sending && handleSend()}
                placeholder="AIチームにメッセージを送信... (Enterで送信)"
                disabled={sending}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: sending ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #a855f7)', opacity: sending ? 0.7 : 1 }}
              >
                {sending ? '⏳' : '送信'}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: '#374151' }}>
              💡 AIエージェントが自動的に応答します。タスクの依頼、分析リクエストなど何でもお送りください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
