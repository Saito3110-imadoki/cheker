# 新規クライアント構築手順書（社内用）

PostPilotの新規クライアントを立ち上げるときの完全チェックリスト。
S-TORA構築（2026-07）で実際にハマったポイントをすべて反映済み。
**上から順にやれば約30分**で構築できる。

---

## 全体の流れ

```
0. ヒアリング
1. クライアント用アカウントの準備（X / Notion / Threads / LINE）
2. リポジトリ作成 & コード配置
3. .env に認証情報を集約 → setup_secrets.py で一括登録
4. Doctor（事前チェック）で全✅を確認   ← ここが品質ゲート
5. テスト生成 → テスト投稿
6. クライアントへ「ご利用ガイド」を渡してレクチャー
```

---

## 0. ヒアリング

`onboarding.py` を対話実行すると `clients/{slug}.yaml` が自動生成される。

```bash
python sns_scheduler/onboarding.py
```

確認しておく項目:
- [ ] 会社名・業種・サイトURL
- [ ] ターゲット読者・トーン（NG表現も）
- [ ] ブランドカラー（無指定なら業種からプリセット提案）
- [ ] 投稿時間帯（ターゲットの生活リズムに合わせる）
- [ ] **XアカウントがPremiumか**（→ 文字数設定が変わる。下記「文字数」参照）
- [ ] Threadsもやるか
- [ ] LINE通知の宛先（先方担当者＋自社担当）

## 1. アカウント準備

### X（Twitter）
1. X Developer Portal でアプリ作成（クライアントのXアカウントでログイン）
2. **User authentication settings → App permissions を「Read and Write」にする**
3. **⚠️ 権限を変えたら Access Token を必ず「再生成」**（変更前のトークンはRead権限のまま → 401の定番原因）
4. 使うのは **OAuth 1.0 の4点**（API Key / API Key Secret / Access Token / Access Token Secret）
   - **OAuth 2.0（Client ID/Secret）やベアラートークンは使わない**。間違えると401
5. **APIプランとクレジット残高を確認**（Pay Per Useで残高$0だと402 credits depleted）
   - X Premium（青バッジ）とAPI課金は**別物**。両方必要
   - 課金は**クライアントごとに分離**（自社一括管理・月額に内包）が方針

### Notion
1. クライアント用のNotionインテグレーション作成 → トークン取得
2. データベース複製 → **DBにインテグレーションを「コネクト」**（テーブルの`…`メニューから。忘れると404）
3. DB IDをURLから取得

### Threads（やる場合）
1. クライアントのThreadsアカウントを**「公開」**にする（非公開だとトークン生成不可）
2. Meta for Developers → アプリ作成 → ユースケースは **「Threads APIにアクセス」** を選ぶ
3. 設定 → **「Threadsテスターを追加」**でクライアントのThreadsユーザー名を招待
4. **クライアント側で招待を承認**（Threads設定 → アカウント → ウェブサイトのアクセス許可 → 招待）
   - ⚠️ スマホアプリで承認ボタンが無反応なことあり → **PC版threads.netで承認** or 削除→再招待→数分待つ
   - 承認前にトークン生成すると `has not accepted the invite` エラー
5. 「ユーザートークン生成ツール」で**長期トークン（60日）**を発行（curlでの交換は不要）
6. userIdは `get_ids.py threads` が自動取得して.envに書き込む

### LINE通知（やる場合）
1. クライアント用LINE公式アカウント＋Messaging APIチャネル
2. **チャネルアクセストークン（長期）**を発行（LINE Developers → Messaging API設定の一番下）
3. 宛先userIdの取得:
   - webhook.site を開き「Your unique URL」をコピー
   - LINE DevelopersのWebhook URLに貼る → Webhook利用ON（応答設定側もON）
   - **宛先本人**に公式アカウントを友だち追加してもらい、一言送ってもらう
   - webhook.siteに届いたJSONの `source.userId`（U始まり33文字）をコピー
   - 用が済んだらWebhook URLは空に戻してOK
4. 宛先は複数OK: `LINE_USER_ID`（先方担当）＋`LINE_USER_ID2`（自社担当）
5. `get_ids.py line` で「表示名が出るか」を確認（＝userId正当＋友だち済みの証明）

## 2. リポジトリ作成

- [ ] `pp-{client}` をprivateで作成
- [ ] コード一式を配置（**マスターはcheker/sns_scheduler。最新版を使うこと**）
- [ ] config.yaml をクライアント用に差し替え（onboarding.pyの生成物ベース）
- [ ] GitHub Pages を有効化（画像ホスティング用）

### 文字数設定（config.yaml）
| Xアカウント | post_length_min/max | x_char_limit |
|---|---|---|
| **Premium加入済み** | 280 / 500 | 0 |
| 無料 | 80 / 135 | 280 |

⚠️ **Premium未加入で長文設定にすると全投稿が失敗する**。加入確認してから切替。

## 3. Secrets登録（一括）

```bash
cp sns_scheduler/.env.example clients/{client}.env
# → 値を埋める（トークン類はこのファイルにだけ書く。チャット/画面共有に出さない）

# Threads userIdを自動取得して.envに書き込み
python sns_scheduler/get_ids.py threads --env clients/{client}.env
# LINE宛先の検証（表示名が出ればOK）
python sns_scheduler/get_ids.py line --env clients/{client}.env
# X認証の確認
python sns_scheduler/get_ids.py x --env clients/{client}.env

# dry-runで確認 → 本登録
python sns_scheduler/setup_secrets.py --env clients/{client}.env --repo {owner}/pp-{client} --dry-run
python sns_scheduler/setup_secrets.py --env clients/{client}.env --repo {owner}/pp-{client}
```

## 4. Doctor（品質ゲート）

- [ ] Actions → **Doctor (事前チェック)** → Run workflow
- [ ] **全✅になるまで本番投入しない**

## 5. テスト

- [ ] Daily Post Generator を手動実行 → Notionに5件・文字数・トーン確認
- [ ] LINE通知が全宛先に届くか確認
- [ ] 1件を「未投稿」に変更 → Auto Poster 手動実行
- [ ] X・Threads両方に投稿されたか（画像付きか）確認
- [ ] Notionのステータスが「投稿済」、投稿IDが記録されたか確認

## 6. クライアントレクチャー

- [ ] 「PostPilot ご利用ガイド」PDF（汎用版）を渡す
- [ ] 承認の操作を1回一緒にやる: **「承認待ち」→「未投稿」に変更＝投稿GOサイン**
- [ ] 何もしなければ投稿されない（安全設計）ことを伝える

---

## 定期メンテナンス

| 項目 | 頻度 | 内容 |
|---|---|---|
| **Threadsトークン更新** | **60日ごと** | 失効するとThreads投稿のみ停止。トークン生成ツールで再発行→Secrets更新。カレンダーにリマインド登録 |
| X APIクレジット残高 | 月1 | Developer Consoleで消費ペース確認（402が出たら枯渇） |
| 実績確認 | 週次 | analyticsのインプレッション推移 |

## よくあるエラー早見表

| エラー | 原因 | 対処 |
|---|---|---|
| X `401 Could not authenticate you` | キー誤り / OAuth2.0を登録 / 権限変更後にトークン未再生成 | OAuth1.0の4点を再生成して入れ直し |
| X `402 credits depleted` | APIクレジット枯渇 | Developer Consoleでクレジット購入 |
| LINE `400 Bad Request` | userId誤り / 空白混入 / 友だち未追加 | doctor or get_ids.py lineで検証 |
| Notion `404` | DBにインテグレーション未コネクト | DBの`…`→コネクト追加 |
| Threads `has not accepted the invite` | テスター招待が未承認 | PC版threads.netで承認 / 再招待→数分待つ |
| Threads画像がテキストのみになる | 画像URLに大文字（GitHub Pagesは小文字が正規） | daily_generator.pyのowner.lower()修正済みか確認 |

---
最終更新: 2026-07-19（S-TORA構築の知見を反映）
