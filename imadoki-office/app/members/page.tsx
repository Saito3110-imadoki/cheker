'use client';

import { useState, useEffect, useRef } from 'react';
import { members as defaultMembers, Member, Department } from '@/lib/data';

const STORAGE_KEY = 'imadoki-members';

const statusLabel: Record<string, string> = { online: '稼働中', busy: '処理中', away: '離席中', offline: 'オフライン' };
const statusColor: Record<string, string> = { online: '#22c55e', busy: '#f59e0b', away: '#6b7280', offline: '#374151' };
const departments: Department[] = ['経営', 'マーケティング戦略', 'クリエイティブ', 'デジタル広告', 'データ分析', '営業', 'PR・広報', 'カスタマーサクセス'];
const avatarOptions = ['👩‍💼', '👨‍💼', '👩‍🎨', '👨‍🎨', '👩‍💻', '👨‍💻', '🤖', '🧑‍🚀', '🧙', '🦸', '🎭', '🎬', '🧑‍🔬', '👩‍🔬', '🧑‍🎤', '🦊', '🐉', '⚡', '🌟', '🔥'];

// 有名人・ユーモアテンプレート
const CELEB_TEMPLATES: Omit<Member, 'id'>[] = [
  { name: 'スティーブ・ジョブズ風AI', nameEn: 'AI Steve J.', role: '製品哲学ディレクター', department: '経営', avatar: '🍎', isAI: true, status: 'online', skills: ['製品哲学', 'プレゼン技術', '完璧主義'], description: '「これは革命だ」と言いながら100回リテイクを要求するAI。でも仕上がりは最高。', aiCapabilities: ['製品コンセプト生成', 'キーノート原稿作成', 'デザイン批評'] },
  { name: 'イーロン・マスク風AI', nameEn: 'AI Elon M.', role: '破壊的イノベーター', department: 'マーケティング戦略', avatar: '🚀', isAI: true, status: 'online', skills: ['ぶっ飛んだ発想', 'バイラルSNS', 'コスト削減'], description: '深夜2時にSlackで「火星に広告出そう」と送ってくるAI。でも数字はすごい。', aiCapabilities: ['バイラル施策立案', 'X(Twitter)運用', 'コスト最適化'] },
  { name: 'ピカチュウ型AIエージェント', nameEn: 'AI Pikachu', role: 'SNS親善大使', department: 'PR・広報', avatar: '⚡', isAI: true, status: 'online', skills: ['バイラル動画', 'キャラクターマーケ', '子供向け施策'], description: 'ピカ！（訳：インプレッション+340%達成しました）。可愛さで全てを解決するAI。', aiCapabilities: ['キャラクターコンテンツ生成', 'TikTok動画企画', 'ブランドキャラ設計'] },
  { name: 'ドラえもん型AI', nameEn: 'AI Doraemon', role: '万能ソリューションAI', department: 'データ分析', avatar: '🔵', isAI: true, status: 'online', skills: ['なんでもできる', '未来予測', '道具調達'], description: '四次元ポケットから施策を取り出す。「こんな道具が欲しかった！」を実現するAI。', aiCapabilities: ['全業務自動化', '未来トレンド予測', 'ツール統合管理'] },
  { name: 'マツコ・デラックス風AI', nameEn: 'AI Matsuko D.', role: '辛口ブランドコンサル', department: 'クリエイティブ', avatar: '💄', isAI: true, status: 'busy', skills: ['辛口批評', 'トレンド分析', '本音マーケ'], description: '「これ、ダメよ。やり直し」と言い続けるが、OKが出ると爆発的に売れる。', aiCapabilities: ['ブランド批評', 'ターゲット分析', 'TV露出施策'] },
  { name: '孫子AI', nameEn: 'AI Sun Tzu', role: '競合戦略参謀', department: 'マーケティング戦略', avatar: '⚔️', isAI: true, status: 'online', skills: ['競合分析', '孫子の兵法', '戦略立案'], description: '「戦わずして勝つ」を現代マーケに応用。2500年前の知恵でバズを量産するAI。', aiCapabilities: ['競合戦略分析', '差別化施策立案', '市場制圧プラン'] },
];

const emptyMember = (): Omit<Member, 'id'> => ({
  name: '', nameEn: '', role: '', department: '経営', avatar: '👩‍💼',
  isAI: false, status: 'online', skills: [], description: '', aiCapabilities: [],
});

// タグ入力コンポーネント
function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const addTag = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInput('');
  };
  return (
    <div className="rounded-lg px-3 py-2 flex flex-wrap gap-1.5 min-h-[42px]"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {values.map(v => (
        <span key={v} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
          {v}
          <button onClick={() => onChange(values.filter(x => x !== v))} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); } }}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={values.length === 0 ? placeholder : '+ 追加'}
        className="bg-transparent text-sm text-white outline-none flex-1 min-w-20"
        style={{ color: '#d1d5db' }}
      />
    </div>
  );
}

// AI採用コンサルパネル
function AIRecruitPanel({ onAdd }: { onAdd: (m: Omit<Member, 'id'>) => void }) {
  const [challenge, setChallenge] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(Omit<Member, 'id'> & { recruitReason?: string }) | null>(null);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quickChallenges = ['SNS運用が追いつかない', '新規クライアントの獲得が弱い', 'データ分析が属人化している', 'クリエイティブの量産が必要', 'PR・広報を強化したい'];

  const recommend = async (text?: string) => {
    const q = text ?? challenge;
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/recommend-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge: q }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult({ ...data, status: 'online' });
    } catch (e) {
      setError('AI提案に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <span className="text-sm font-bold text-white">AI採用コンサルタント</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>Claude AI</span>
      </div>
      <p className="text-xs mb-3" style={{ color: '#6b7280' }}>今の課題を入力すると、最適なAI人材（ユーモアあり）を提案・即採用できます</p>

      {/* Quick select */}
      <div className="flex flex-wrap gap-2 mb-3">
        {quickChallenges.map(q => (
          <button key={q} onClick={() => { setChallenge(q); recommend(q); }}
            className="text-xs px-2.5 py-1 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={challenge}
          onChange={e => setChallenge(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); recommend(); } }}
          placeholder="例：インフルエンサーマーケティングを始めたい、毎月のレポート作成が大変..."
          rows={2}
          className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <button onClick={() => recommend()}
          disabled={loading || !challenge.trim()}
          className="px-4 rounded-xl text-sm font-semibold text-white transition-all flex-shrink-0"
          style={{ background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #a855f7)', opacity: !challenge.trim() ? 0.5 : 1 }}>
          {loading ? '考え中...' : '提案 →'}
        </button>
      </div>

      {error && <p className="text-xs mt-2" style={{ color: '#fca5a5' }}>⚠️ {error}</p>}

      {result && (
        <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.15)' }}>{result.avatar}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-white">{result.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>AI</span>
              </div>
              <div className="text-xs" style={{ color: '#818cf8' }}>{result.role}</div>
              <div className="text-xs" style={{ color: '#6b7280' }}>{result.department}</div>
            </div>
          </div>
          <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>{result.description}</p>
          {result.recruitReason && (
            <div className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>
              💡 採用理由: {result.recruitReason}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {result.skills.map(s => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', fontSize: '10px' }}>{s}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onAdd(result); setResult(null); setChallenge(''); }}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              ✅ このメンバーを採用する
            </button>
            <button onClick={() => recommend()}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
              🔄 別の提案
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 有名人追加パネル
function CelebPanel({ onAdd }: { onAdd: (m: Omit<Member, 'id'>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)}
        className="text-xs px-3 py-1.5 rounded-lg transition-all"
        style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc' }}>
        🎭 有名人・ユニークメンバーを追加 {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
          {CELEB_TEMPLATES.map(tmpl => (
            <div key={tmpl.name} className="glass rounded-xl p-3 flex flex-col gap-2"
              style={{ border: '1px solid rgba(168,85,247,0.15)' }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{tmpl.avatar}</span>
                <div>
                  <div className="text-xs font-semibold text-white truncate">{tmpl.name}</div>
                  <div className="text-xs" style={{ color: '#6b7280', fontSize: '10px' }}>{tmpl.role}</div>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#9ca3af', fontSize: '10px' }}>{tmpl.description}</p>
              <button onClick={() => onAdd(tmpl)}
                className="w-full py-1 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>
                採用する
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// メンバー編集フォーム
function MemberForm({ initial, title, isSelf, onSave, onCancel }: {
  initial: Omit<Member, 'id'>;
  title: string;
  isSelf?: boolean;
  onSave: (m: Omit<Member, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const set = (f: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [f]: v }));

  const isValid = form.name.trim() !== '' && form.role.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ border: `1px solid ${isSelf ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.3)'}` }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            {isSelf && <span className="text-amber-400">👑</span>}
            {title}
            {isSelf && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>自分のプロフィール</span>}
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <div className="space-y-4">
          {/* Avatar picker */}
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: '#6b7280' }}>アバター</label>
            <div className="flex flex-wrap gap-2">
              {avatarOptions.map(a => (
                <button key={a} onClick={() => set('avatar', a)}
                  className="w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all"
                  style={{
                    background: form.avatar === a ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${form.avatar === a ? '#6366f1' : 'transparent'}`,
                  }}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Type & Status */}
          <div className="flex gap-3 flex-wrap">
            {!isSelf && (
              <div>
                <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>種別</label>
                <div className="flex gap-2">
                  {[false, true].map(ai => (
                    <button key={String(ai)} onClick={() => set('isAI', ai)}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: form.isAI === ai ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                        color: form.isAI === ai ? '#a5b4fc' : '#6b7280',
                        border: `1px solid ${form.isAI === ai ? 'rgba(99,102,241,0.5)' : 'transparent'}`,
                      }}>
                      {ai ? '🤖 AI' : '👤 人間'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>ステータス</label>
              <select value={form.status} onChange={e => set('status', e.target.value as Member['status'])}
                className="rounded-lg px-2 py-2 text-xs outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: statusColor[form.status] }}>
                {Object.entries(statusLabel).map(([k, v]) => (
                  <option key={k} value={k} style={{ background: '#0f0f1a', color: statusColor[k] }}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Name & Role */}
          {[
            { label: '名前 *', key: 'name' as const, placeholder: '例：今時 花子' },
            { label: '役職 *', key: 'role' as const, placeholder: '例：マーケティングマネージャー' },
            { label: '英語名', key: 'nameEn' as const, placeholder: '例：Hanako Imadoki' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>{f.label}</label>
              <input value={form[f.key] as string} onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          ))}

          {/* Department */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>部署</label>
            <div className="flex flex-wrap gap-2">
              {departments.map(d => (
                <button key={d} onClick={() => set('department', d)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: form.department === d ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    color: form.department === d ? '#a5b4fc' : '#6b7280',
                    border: `1px solid ${form.department === d ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>プロフィール・説明</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="役割や特徴など..."
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          {/* Skills - multi tag */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>スキル（Enterまたはカンマで追加）</label>
            <TagInput values={form.skills} onChange={v => set('skills', v)} placeholder="スキルを入力..." />
          </div>

          {/* AI capabilities */}
          {form.isAI && (
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>AI機能（Enterまたはカンマで追加）</label>
              <TagInput values={form.aiCapabilities ?? []} onChange={v => set('aiCapabilities', v)} placeholder="AI機能を入力..." />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => isValid && onSave(form)} disabled={!isValid}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: isSelf ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #a855f7)', opacity: !isValid ? 0.5 : 1 }}>
            {isSelf ? '👑 プロフィールを更新' : '保存する'}
          </button>
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberDetail({ member, isSelf, onClose, onEdit, onDelete }: {
  member: Member;
  isSelf: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="glass rounded-2xl p-6 max-w-md w-full"
        style={{ border: `1px solid ${isSelf ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.3)'}` }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: member.isAI ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.15)' }}>
              {member.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isSelf && <span className="text-amber-400">👑</span>}
                <h2 className="text-lg font-bold text-white">{member.name}</h2>
                {member.isAI && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>AI</span>}
              </div>
              <div className="text-sm" style={{ color: '#818cf8' }}>{member.role}</div>
              <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{member.department}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <div className="flex items-center gap-2 mb-4 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: statusColor[member.status], boxShadow: member.status === 'online' ? `0 0 6px ${statusColor[member.status]}` : 'none' }} />
          <span className="text-xs" style={{ color: statusColor[member.status] }}>{statusLabel[member.status]}</span>
        </div>

        {member.description && <p className="text-sm leading-relaxed mb-4" style={{ color: '#9ca3af' }}>{member.description}</p>}

        {member.skills.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-white mb-2">スキル</div>
            <div className="flex flex-wrap gap-2">
              {member.skills.map(s => (
                <span key={s} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {member.aiCapabilities && member.aiCapabilities.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-white mb-2">🤖 AI機能</div>
            <div className="space-y-1.5">
              {member.aiCapabilities.map(cap => (
                <div key={cap} className="flex items-center gap-2 text-xs" style={{ color: '#9ca3af' }}>
                  <span style={{ color: '#6366f1' }}>▸</span> {cap}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onEdit} className="flex-1 py-2 rounded-xl text-xs font-medium"
            style={{ background: isSelf ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)', border: `1px solid ${isSelf ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}`, color: isSelf ? '#fbbf24' : '#a5b4fc' }}>
            {isSelf ? '👑 プロフィール編集' : '✏️ 編集'}
          </button>
          {!isSelf && (
            <button onClick={onDelete} className="px-4 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              🗑️ 削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [selected, setSelected] = useState<Member | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ai' | 'human'>('all');
  const [deptFilter, setDeptFilter] = useState('全部署');
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setMembers(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const persist = (next: Member[]) => {
    try {
      setMembers(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // サイドバー・組織図など他ページに変更を通知
      window.dispatchEvent(new Event('imadoki-members-updated'));
    } catch {
      showToast('⚠️ 保存に失敗しました');
    }
  };

  const handleAdd = (form: Omit<Member, 'id'>) => {
    const next = [...members, { ...form, id: `m-${Date.now()}` }];
    persist(next);
    setAdding(false);
    showToast(`✅ ${form.name} を採用しました！`);
  };

  const handleAIAdd = (form: Omit<Member, 'id'>) => {
    const next = [...members, { ...form, id: `m-ai-${Date.now()}`, status: 'online' as const }];
    persist(next);
    showToast(`🤖 ${form.name} をAI採用しました！`);
  };

  const handleEdit = (form: Omit<Member, 'id'>) => {
    if (!editing) return;
    const next = members.map(m => m.id === editing.id ? { ...form, id: m.id } : m);
    persist(next);
    setEditing(null);
    setSelected(null);
    showToast('✅ プロフィールを更新しました');
  };

  const handleDelete = (id: string) => {
    const m = members.find(m => m.id === id);
    if (!confirm(`「${m?.name}」を削除しますか？`)) return;
    persist(members.filter(m => m.id !== id));
    setSelected(null);
    showToast('🗑️ メンバーを削除しました');
  };

  const handleReset = () => {
    if (!confirm('メンバーをデフォルトにリセットしますか？')) return;
    persist(defaultMembers);
    showToast('🔄 リセットしました');
  };

  // CEO（自分）を判定
  const selfMember = members.find(m => m.id === 'ceo') ?? members.find(m => !m.isAI);

  const depts = ['全部署', ...Array.from(new Set(members.map(m => m.department)))];
  const filtered = members.filter(m => {
    const aiMatch = filter === 'all' || (filter === 'ai' && m.isAI) || (filter === 'human' && !m.isAI);
    const deptMatch = deptFilter === '全部署' || m.department === deptFilter;
    return aiMatch && deptMatch;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm text-white shadow-lg"
          style={{ background: 'rgba(99,102,241,0.9)', border: '1px solid rgba(99,102,241,0.5)' }}>
          {toast}
        </div>
      )}

      {/* Modals */}
      {adding && <MemberForm title="新しいメンバーを追加" initial={emptyMember()} onSave={handleAdd} onCancel={() => setAdding(false)} />}
      {editing && (
        <MemberForm
          title={editing.id === selfMember?.id ? 'プロフィールを編集' : 'メンバーを編集'}
          initial={editing}
          isSelf={editing.id === selfMember?.id}
          onSave={handleEdit}
          onCancel={() => setEditing(null)}
        />
      )}
      {selected && !editing && (
        <MemberDetail
          member={selected}
          isSelf={selected.id === selfMember?.id}
          onClose={() => setSelected(null)}
          onEdit={() => setEditing(selected)}
          onDelete={() => handleDelete(selected.id)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">👥 メンバー</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>人間・AIエージェント・ユニーク人材が集うチーム</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selfMember && (
            <button onClick={() => setEditing(selfMember)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
              👑 自分のプロフィール
            </button>
          )}
          <button onClick={handleReset} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}>
            🔄 リセット
          </button>
          <button onClick={() => setAdding(true)}
            className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            ＋ メンバー追加
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: '総メンバー', value: members.length, color: '#6366f1', icon: '👥' },
          { label: 'AIエージェント', value: members.filter(m => m.isAI).length, color: '#a855f7', icon: '🤖' },
          { label: '人間スタッフ', value: members.filter(m => !m.isAI).length, color: '#ec4899', icon: '👤' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI Recruit Panel */}
      <AIRecruitPanel onAdd={handleAIAdd} />

      {/* Celeb Panel */}
      <CelebPanel onAdd={handleAIAdd} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {(['all', 'ai', 'human'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{ background: filter === f ? 'rgba(99,102,241,0.2)' : 'transparent', color: filter === f ? '#a5b4fc' : '#6b7280' }}>
              {f === 'all' ? 'すべて' : f === 'ai' ? '🤖 AI' : '👤 人間'}
            </button>
          ))}
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
          {depts.map(d => <option key={d} value={d} style={{ background: '#0f0f1a' }}>{d}</option>)}
        </select>
      </div>

      {/* Members grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(m => {
          const isSelf = m.id === selfMember?.id;
          return (
            <div key={m.id} onClick={() => setSelected(m)}
              className="glass glass-hover rounded-xl p-4 cursor-pointer relative group"
              style={{ border: isSelf ? '1px solid rgba(245,158,11,0.3)' : undefined }}>
              {isSelf && (
                <div className="absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>👑 自分</div>
              )}
              <div className="flex items-start gap-3 mb-3" style={{ marginTop: isSelf ? '18px' : 0 }}>
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: m.isAI ? 'rgba(99,102,241,0.12)' : 'rgba(168,85,247,0.12)' }}>
                    {m.avatar}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ borderColor: '#07070f', background: statusColor[m.status], boxShadow: m.status === 'online' ? `0 0 6px ${statusColor[m.status]}` : 'none' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-semibold text-white truncate">{m.name}</span>
                    {m.isAI && <span className="text-xs px-1.5 rounded flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>AI</span>}
                  </div>
                  <div className="text-xs truncate" style={{ color: '#6b7280' }}>{m.role.split('/')[0]}</div>
                  <div className="text-xs" style={{ color: '#4b5563', fontSize: '10px' }}>{m.department}</div>
                </div>
              </div>
              {m.description && (
                <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: '#9ca3af' }}>{m.description}</p>
              )}
              {m.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {m.skills.slice(0, 3).map(s => (
                    <span key={s} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: '10px' }}>{s}</span>
                  ))}
                </div>
              )}
              {/* Hover actions */}
              <div className="absolute top-2 right-2 hidden group-hover:flex gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => setEditing(m)} className="p-1 rounded text-xs" style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>✏️</button>
                {!isSelf && <button onClick={() => handleDelete(m.id)} className="p-1 rounded text-xs" style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>🗑️</button>}
              </div>
            </div>
          );
        })}

        {/* Add card */}
        <div onClick={() => setAdding(true)}
          className="glass rounded-xl p-4 cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[120px] transition-all"
          style={{ border: '2px dashed rgba(99,102,241,0.2)' }}>
          <div className="text-3xl" style={{ color: 'rgba(99,102,241,0.4)' }}>＋</div>
          <span className="text-xs" style={{ color: '#6b7280' }}>メンバーを追加</span>
        </div>
      </div>
    </div>
  );
}
