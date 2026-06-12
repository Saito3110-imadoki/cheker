'use client';

import { useState } from 'react';
import { members } from '@/lib/data';

const aiAgents = members.filter(m => m.isAI);

const capabilities = [
  { icon: '📊', title: 'データ分析・レポート', desc: 'マーケティングデータをリアルタイム分析し、インサイトを自動生成', agent: 'data-ai' },
  { icon: '🎨', title: 'クリエイティブ生成', desc: '広告バナー・コピーをAIが自動生成。A/Bテスト用の複数案を瞬時に作成', agent: 'creative-ai' },
  { icon: '📢', title: '広告入札最適化', desc: 'Google/Meta広告の入札をリアルタイム自動調整。ROAS最大化', agent: 'ads-ai' },
  { icon: '📋', title: '戦略立案', desc: '市場トレンドと競合分析に基づき、マーケティング戦略を自動策定', agent: 'strategy-ai' },
  { icon: '📰', title: 'PR・プレスリリース', desc: 'プレスリリース・SNS投稿をブランドトーンに合わせて自動生成', agent: 'pr-ai' },
  { icon: '📈', title: '営業支援', desc: '提案書の自動作成、リードスコアリング、フォローアップを自動化', agent: 'sales-ai' },
  { icon: '🔧', title: 'プロジェクト管理', desc: '全プロジェクトの進捗を24時間監視。ボトルネックを自動検出', agent: 'pm-ai' },
  { icon: '💝', title: 'カスタマーサクセス', desc: '顧客の健全度をスコアリング。チャーンリスクをプロアクティブに検知', agent: 'cs-ai' },
];

export default function AIHubPage() {
  const [selectedAgent, setSelectedAgent] = useState(aiAgents[0]);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const demoResponses: Record<string, string[]> = {
    'data-ai': [
      '📊 分析完了！先月のSNS広告パフォーマンス:\n\n• インプレッション: 2,847,392 (+34%)\n• CTR: 3.2% (業界平均比+180%)\n• CPA: ¥1,240 (-18% 改善)\n• ROAS: 4.2x → 予算効率が最高水準\n\n🔍 主要インサイト: Instagramストーリーズが最も高効率。TikTok動画のエンゲージメントは前月比+89%で急成長中。',
      '📈 今週のデータサマリーを作成しました。コンバージョン率が2.3%→3.1%に改善。主因はランディングページのA/Bテスト結果を反映したことによるものです。',
    ],
    'creative-ai': [
      '🎨 クリエイティブ案を3パターン生成しました:\n\n【案A】ミニマル訴求\nコピー: "シンプルに、もっと遠くへ。"\nカラー: ホワイト×ネイビー\n\n【案B】感情訴求\nコピー: "あなたの想いを、世界に届ける。"\nカラー: オレンジ×ゴールド\n\n【案C】数字訴求\nコピー: "導入企業の97%が満足。"\nカラー: グリーン×ホワイト\n\nA/Bテスト用に全案のHTMLバナーも準備しています。',
    ],
    'strategy-ai': [
      '📋 マーケティング戦略レポートを生成しました:\n\n■ 現状分析\n・認知度: ターゲット層の23% (改善余地あり)\n・検討率: 認知者の41% (高水準)\n・購買率: 検討者の18%\n\n■ 推奨戦略\n1. 認知拡大: TikTok/InstagramリールでUGC施策\n2. 検討促進: 事例コンテンツとウェビナー\n3. 購買促進: リターゲティング広告強化\n\n■ KPI目標\n・3ヶ月で認知度35%、CVR22%を目指します。',
    ],
  };

  const handleExecute = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          agentId: selectedAgent.id,
          context: `あなたの役職: ${selectedAgent.role}, 部署: ${selectedAgent.department}`,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('API error');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setResponse(accumulated);
      }
    } catch {
      const fallback = demoResponses[selectedAgent.id];
      setResponse(fallback ? fallback[0] : 'タスクを受け付けました。処理を開始します...');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">🤖 AIハブ</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>AIエージェントに直接タスクを依頼・管理するコントロールパネル</p>
      </div>

      {/* Capability cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {capabilities.map(cap => (
          <div
            key={cap.agent}
            onClick={() => {
              const agent = aiAgents.find(a => a.id === cap.agent);
              if (agent) setSelectedAgent(agent);
            }}
            className="glass glass-hover rounded-xl p-4 cursor-pointer"
            style={{ border: selectedAgent.id === cap.agent ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-2xl mb-2">{cap.icon}</div>
            <div className="text-sm font-semibold text-white mb-1">{cap.title}</div>
            <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>{cap.desc}</p>
          </div>
        ))}
      </div>

      {/* Agent console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent list */}
        <div className="glass rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">AIエージェント選択</h3>
          <div className="space-y-2">
            {aiAgents.map(agent => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                style={{
                  background: selectedAgent.id === agent.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedAgent.id === agent.id ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.12)' }}>🤖</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{agent.name}</div>
                  <div className="text-xs truncate" style={{ color: '#6b7280', fontSize: '10px' }}>{agent.department}</div>
                </div>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                  background: agent.status === 'online' ? '#22c55e' : '#f59e0b',
                  boxShadow: agent.status === 'online' ? '0 0 5px #22c55e' : 'none',
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Console */}
        <div className="lg:col-span-2 glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'rgba(99,102,241,0.15)' }}>🤖</div>
            <div>
              <div className="text-sm font-bold text-white">{selectedAgent.name}</div>
              <div className="text-xs" style={{ color: '#818cf8' }}>{selectedAgent.role}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              <span className="text-xs" style={{ color: '#22c55e' }}>稼働中</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs font-semibold text-white mb-2">機能</div>
            <div className="flex flex-wrap gap-2">
              {selectedAgent.aiCapabilities?.map(cap => (
                <button
                  key={cap}
                  onClick={() => setPrompt(cap)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={`${selectedAgent.name}へのタスクや質問を入力...`}
            rows={3}
            className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none resize-none mb-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          />

          <button
            onClick={handleExecute}
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all mb-4"
            style={{
              background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '⏳ 処理中...' : '▶ AIに実行させる'}
          </button>

          {response && (
            <div className="rounded-xl p-4 animate-fade-up" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: '#818cf8' }}>
                <span>🤖</span> {selectedAgent.name}からの回答
              </div>
              <pre className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#d1d5db', fontFamily: 'inherit' }}>
                {response}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
