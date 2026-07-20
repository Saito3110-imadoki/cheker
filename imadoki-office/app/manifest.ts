import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IMADOKI AI Office',
    short_name: 'IMADOKI',
    description: '株式会社IMADOKIのAI経営管理プラットフォーム — 売上分析・請求書・AIレポート',
    start_url: '/',
    display: 'standalone',
    background_color: '#07070f',
    theme_color: '#6366f1',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
