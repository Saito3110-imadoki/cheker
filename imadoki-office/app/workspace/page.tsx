'use client';

import { useState, useRef, useEffect } from 'react';

type ProjectType = 'web' | 'webmarketing' | 'sns' | 'video' | 'strategy';
type Phase = 'input' | 'kickoff' | 'chat' | 'deliverables';

interface KickoffResult {
  projectSummary: string;
  targetAudience: string;
  keyObjectives: string[];
  suggestedTeam: { role: string; memberType: string; task: string }[];
  clarificationQuestions: { question: string; why: string }[];
  deliverables: { type: string; description: string; category: string }[];
  timeline: string;
  kickoffMessage: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  persona?: { name: string; role: string; avatar: string };
}

interface Deliverable {
  id: string;
  type: string;
  content: string;
  approved: boolean;
  requestedChanges?: string;
}

const PROJECT_TYPES: { value: ProjectType; label: string; icon: string; roleKey: string }[] = [
  { value: 'web', label: 'WEB制作', icon: '🌐', roleKey: 'web' },
  { value: 'webmarketing', label: 'WEBマーケ', icon: '📈', roleKey: 'strategist' },
  { value: 'sns', label: 'SNSマーケ', icon: '📱', roleKey: 'sns' },
  { value: 'video', label: 'SNS動画', icon: '🎬', roleKey: 'video' },
  { value: 'strategy', label: '総合戦略', icon: '🧠', roleKey: 'strategist' },
];

const DELIVERABLE_TEMPLATES: Record<string, { label: string; prompt: string }[]> = {
  web: [
    { label: 'サイト構成案', prompt: 'ウェブサイトのサイトマップとページ構成案を作成してください' },
    { label: 'キャッチコピー', prompt: 'トップページのキャッチコピーと説明文を5パターン作成してください' },
    { label: 'CTA文案', prompt: 'コンバージョンを最大化するCTA（行動喚起）テキストを10個作成してください' },
  ],
  webmarketing: [
    { label: 'SEO戦略', prompt: 'SEOキーワード戦略と3ヶ月のコンテンツカレンダーを作成してください' },
    { label: 'LPコピー', prompt: 'ランディングページ全体のコピー（ヘッドライン〜CTA）を作成してください' },
    { label: '広告文案', prompt: 'リスティング広告の見出し・説明文を10セット作成してください' },
  ],
  sns: [
    { label: 'SNS投稿カレンダー', prompt: '1ヶ月分のSNS投稿カレンダーとコンテンツ案を作成してください' },
    { label: '投稿文テンプレ', prompt: '各SNS（Instagram/X/TikTok）向けの投稿文テンプレートを5パターン作成してください' },
    { label: 'ハッシュタグ戦略', prompt: 'ターゲットに刺さるハッシュタグ戦略と推奨リストを作成してください' },
  ],
  video: [
    { label: '動画構成案', prompt: '60秒・30秒・15秒の動画構成案（絵コンテ）を作成してください' },
    { label: 'スクリプト', prompt: '動画のナレーション・テロップスクリプトを作成してください' },
    { label: 'BGM・演出案', prompt: 'ターゲットに合ったBGMの方向性と映像演出案を提案してください' },
  ],
  strategy: [
    { label: 'マーケ戦略書', prompt: '3ヶ月のマーケティング戦略書を作成してください（目標・施策・KPI含む）' },
    { label: '競合分析', prompt: '競合他社との比較分析と差別化ポイントをまとめてください' },
    { label: 'ROI予測', prompt: '施策別のROI予測と優先順位付けを行ってください' },
  ],
};

export default function WorkspacePage() {
  const [phase, setPhase] = useState<Phase>('input');
  const [projectType, setProjectType] = useState<ProjectType>('web');
  const [clientName, setClientName] = useState('');
  const [brief, setBrief] = useState('');
  const [urls, setUrls] = useState('');
  const [requirements, setRequirements] = useState('');
  const [kickoffResult, setKickoffResult] = useState<KickoffResult | null>(null);
  const [loadingKickoff, setLoadingKickoff] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activeRole, setActiveRole] = useState('strategist');
  const [feedbackInput, setFeedbackInput] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedType = PROJECT_TYPES.find(t => t.value === projectType)!;

  async function startKickoff() {
    setLoadingKickoff(true);
    try {
      const res = await fetch('/api/workspace/kickoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType,
          clientName,
          brief,
          urls: urls.split('\n').filter(Boolean),
          requirements,
        }),
      });
      const data = await res.json();
      setKickoffResult(data);
      setActiveRole(selectedType.roleKey);
      const firstMsg: ChatMessage = {
        role: 'assistant',
        content: `${data.kickoffMessage}\n\nまず、プロジェクトをより良くするためにいくつか確認させてください：\n\n${data.clarificationQuestions
          .slice(0, 2)
          .map((q: { question: string; why: string }, i: number) => `**Q${i + 1}: ${q.question}**\n→ ${q.why}`)
          .join('\n\n')}`,
        persona: { name: 'AI-PM ζ', role: 'プロジェクトマネージャー', avatar: '📋' },
      };
      setMessages([firstMsg]);
      setPhase('kickoff');
    } catch (e) {
      alert('キックオフ分析に失敗しました: ' + e);
    } finally {
      setLoadingKickoff(false);
    }
  }

  async function sendMessage(content?: string) {
    const text = content || inputMsg.trim();
    if (!text || streaming) return;
    setInputMsg('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setStreaming(true);

    const assistantMsg: ChatMessage = { role: 'assistant', content: '', persona: undefined };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          role: activeRole,
          projectContext: kickoffResult,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'persona') {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], persona: data.persona };
                return updated;
              });
            } else if (data.type === 'text') {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + data.text,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'エラーが発生しました: ' + e };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function generateDeliverable(template: { label: string; prompt: string }) {
    setStreaming(true);
    const newDeliverable: Deliverable = {
      id: Date.now().toString(),
      type: template.label,
      content: '',
      approved: false,
    };
    setDeliverables(prev => [...prev, newDeliverable]);
    setPhase('deliverables');

    const conversationContext = messages
      .slice(-6)
      .map(m => `${m.role === 'user' ? '社長' : 'AI'}: ${m.content}`)
      .join('\n');

    try {
      const res = await fetch('/api/workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `${template.prompt}\n\nこれまでの会話コンテキスト:\n${conversationContext}`,
            },
          ],
          role: activeRole,
          projectContext: kickoffResult,
          deliverableRequest: template.label,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              setDeliverables(prev =>
                prev.map(d => (d.id === newDeliverable.id ? { ...d, content: d.content + data.text } : d))
              );
            }
          } catch {}
        }
      }
    } catch (e) {
      setDeliverables(prev =>
        prev.map(d => (d.id === newDeliverable.id ? { ...d, content: 'エラー: ' + e } : d))
      );
    } finally {
      setStreaming(false);
    }
  }

  async function requestChanges(deliverable: Deliverable) {
    const feedback = feedbackInput[deliverable.id];
    if (!feedback) return;
    setFeedbackInput(prev => ({ ...prev, [deliverable.id]: '' }));
    setStreaming(true);

    setDeliverables(prev =>
      prev.map(d => (d.id === deliverable.id ? { ...d, content: '', requestedChanges: feedback } : d))
    );

    try {
      const res = await fetch('/api/workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `以下の成果物（${deliverable.type}）を修正してください。\n\n【元の成果物】\n${deliverable.content}\n\n【修正指示】\n${feedback}`,
            },
          ],
          role: activeRole,
          projectContext: kickoffResult,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              setDeliverables(prev =>
                prev.map(d => (d.id === deliverable.id ? { ...d, content: d.content + data.text } : d))
              );
            }
          } catch {}
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  const templates = DELIVERABLE_TEMPLATES[projectType] || DELIVERABLE_TEMPLATES.strategy;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">🚀 AIプロジェクトワークスペース</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>AIチームがプロジェクトを完遂します</p>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(['input', 'kickoff', 'chat', 'deliverables'] as Phase[]).map((p, i) => {
          const labels: Record<Phase, string> = { input: '1. ブリーフ入力', kickoff: '2. キックオフ', chat: '3. AI対話', deliverables: '4. 成果物' };
          const active = p === phase;
          const done = ['input', 'kickoff', 'chat', 'deliverables'].indexOf(p) < ['input', 'kickoff', 'chat', 'deliverables'].indexOf(phase);
          return (
            <div key={p} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px" style={{ background: 'rgba(99,102,241,0.3)' }} />}
              <button
                onClick={() => (done || active) && setPhase(p)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: active ? 'rgba(99,102,241,0.2)' : done ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#a5b4fc' : done ? '#4ade80' : '#6b7280',
                  border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {done ? '✓ ' : ''}{labels[p]}
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Brief input */}
          <div className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">📋 案件ブリーフ</h2>

            <div className="mb-4">
              <label className="text-xs mb-2 block" style={{ color: '#9ca3af' }}>案件種別</label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setProjectType(t.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                    style={{
                      background: projectType === t.value ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                      color: projectType === t.value ? '#a5b4fc' : '#9ca3af',
                      border: `1px solid ${projectType === t.value ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs mb-1 block" style={{ color: '#9ca3af' }}>クライアント名</label>
              <input
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="例：株式会社〇〇"
                className="w-full text-sm px-3 py-2 rounded-lg outline-none text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            <div className="mb-3">
              <label className="text-xs mb-1 block" style={{ color: '#9ca3af' }}>案件概要・要望（抽象的でもOK）</label>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder="例：若い女性向けのオシャレなブランドイメージを作りたい。SNSでバズらせたい。"
                rows={4}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none text-white resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            <div className="mb-3">
              <label className="text-xs mb-1 block" style={{ color: '#9ca3af' }}>参考URL（1行1URL）</label>
              <textarea
                value={urls}
                onChange={e => setUrls(e.target.value)}
                placeholder="https://example.com&#10;https://competitor.com"
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none text-white resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: '#9ca3af' }}>追加要件・制約</label>
              <textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="例：予算50万円、納期1ヶ月、NGワードあり"
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none text-white resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            <button
              onClick={startKickoff}
              disabled={!clientName || !brief || loadingKickoff}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: clientName && brief && !loadingKickoff ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.05)',
                color: clientName && brief && !loadingKickoff ? 'white' : '#6b7280',
                cursor: clientName && brief && !loadingKickoff ? 'pointer' : 'not-allowed',
              }}
            >
              {loadingKickoff ? '🧠 AIが分析中...' : '🚀 AIキックオフ開始'}
            </button>
          </div>

          {/* Kickoff summary */}
          {kickoffResult && (
            <div className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">📊 プロジェクト分析</h2>
              <div className="text-xs space-y-3" style={{ color: '#9ca3af' }}>
                <div>
                  <div className="text-white font-medium mb-1">概要</div>
                  <div>{kickoffResult.projectSummary}</div>
                </div>
                <div>
                  <div className="text-white font-medium mb-1">ターゲット</div>
                  <div>{kickoffResult.targetAudience}</div>
                </div>
                <div>
                  <div className="text-white font-medium mb-1">目標</div>
                  <ul className="space-y-0.5">
                    {kickoffResult.keyObjectives?.map((o, i) => (
                      <li key={i}>• {o}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-white font-medium mb-1">スケジュール</div>
                  <div>{kickoffResult.timeline}</div>
                </div>
              </div>
            </div>
          )}

          {/* Deliverable templates */}
          {kickoffResult && (
            <div className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">✨ 成果物を生成</h2>
              <div className="space-y-2">
                {templates.map(t => (
                  <button
                    key={t.label}
                    onClick={() => generateDeliverable(t)}
                    disabled={streaming}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all glass-hover"
                    style={{
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.15)',
                      color: '#a5b4fc',
                      opacity: streaming ? 0.5 : 1,
                    }}
                  >
                    <span className="font-medium">{t.label}</span>
                    <div style={{ color: '#6b7280', fontSize: '10px', marginTop: '2px' }}>{t.prompt.slice(0, 40)}...</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI Chat */}
          {(phase === 'kickoff' || phase === 'chat' || phase === 'deliverables') && (
            <div className="glass rounded-xl flex flex-col" style={{ height: '480px' }}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <h2 className="text-sm font-semibold text-white">💬 AIチームとの対話</h2>
                <div className="flex gap-2">
                  {PROJECT_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { setActiveRole(t.roleKey); setPhase('chat'); }}
                      className="text-xs px-2 py-1 rounded transition-all"
                      style={{
                        background: activeRole === t.roleKey ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                        color: activeRole === t.roleKey ? '#a5b4fc' : '#6b7280',
                      }}
                    >
                      {t.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 self-end"
                        style={{ background: 'rgba(99,102,241,0.15)' }}
                      >
                        {msg.persona?.avatar ?? '🤖'}
                      </div>
                    )}
                    <div style={{ maxWidth: '75%' }}>
                      {msg.role === 'assistant' && msg.persona && (
                        <div className="text-xs mb-1" style={{ color: '#6b7280' }}>
                          {msg.persona.name} · {msg.persona.role}
                        </div>
                      )}
                      <div
                        className="text-sm px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap"
                        style={{
                          background: msg.role === 'user' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                          color: msg.role === 'user' ? '#c7d2fe' : '#e5e7eb',
                          borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                          borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
                        }}
                      >
                        {msg.content || (streaming && i === messages.length - 1 ? '▌' : '')}
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 self-end"
                        style={{ background: 'rgba(168,85,247,0.15)' }}
                      >
                        👔
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex gap-2">
                  <input
                    value={inputMsg}
                    onChange={e => setInputMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="AIチームに質問・指示を入力..."
                    disabled={streaming}
                    className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none text-white"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!inputMsg.trim() || streaming}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: inputMsg.trim() && !streaming ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.05)',
                      color: inputMsg.trim() && !streaming ? 'white' : '#6b7280',
                    }}
                  >
                    送信
                  </button>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['もっと具体的に教えてください', 'ターゲットを絞ってください', '他の案も見せてください'].map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      disabled={streaming}
                      className="text-xs px-2.5 py-1 rounded-full transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Deliverables */}
          {deliverables.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white">📄 生成された成果物</h2>
              {deliverables.map(d => (
                <div key={d.id} className="glass rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{d.type}</span>
                      {d.approved && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                          ✓ 承認済み
                        </span>
                      )}
                    </div>
                    {!d.approved && (
                      <button
                        onClick={() => setDeliverables(prev => prev.map(x => x.id === d.id ? { ...x, approved: true } : x))}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}
                      >
                        ✓ 承認する
                      </button>
                    )}
                  </div>

                  <div
                    className="text-sm whitespace-pre-wrap rounded-lg p-4 mb-3 leading-relaxed"
                    style={{ background: 'rgba(255,255,255,0.03)', color: '#e5e7eb', minHeight: '80px' }}
                  >
                    {d.content || (streaming ? '生成中...' : '')}
                  </div>

                  {!d.approved && (
                    <div className="flex gap-2">
                      <input
                        value={feedbackInput[d.id] || ''}
                        onChange={e => setFeedbackInput(prev => ({ ...prev, [d.id]: e.target.value }))}
                        placeholder="修正指示を入力（例：もっとカジュアルなトーンで）"
                        className="flex-1 text-xs px-3 py-2 rounded-lg outline-none text-white"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                      <button
                        onClick={() => requestChanges(d)}
                        disabled={!feedbackInput[d.id] || streaming}
                        className="text-xs px-3 py-2 rounded-lg transition-all"
                        style={{
                          background: feedbackInput[d.id] && !streaming ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                          color: feedbackInput[d.id] && !streaming ? '#fbbf24' : '#6b7280',
                          border: '1px solid rgba(245,158,11,0.2)',
                        }}
                      >
                        修正依頼
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {phase === 'input' && (
            <div className="glass rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">🚀</div>
              <div className="text-white font-semibold mb-2">AIプロジェクトチームが待機中</div>
              <div className="text-sm" style={{ color: '#6b7280' }}>
                左のフォームにクライアント情報と案件概要を入力して<br />キックオフを開始してください
              </div>
              <div className="flex justify-center gap-4 mt-6">
                {['🧠 戦略立案', '✍️ コピー生成', '📱 SNS投稿', '🌐 WEB設計', '🎬 動画企画'].map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
