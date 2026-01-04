# 詳細版 基本計画：Docker+WordPressで作る「生成AI連携 英語日記Webアプリ」（WSL/VS Code前提）

> 目的：この文書だけ読めば「何を・どの順番で・どこを編集して」開発を進めればいいかが分かるようにする。

---

## 1. 何を作るのか（完成イメージ）
### 1.1 使い方（ユーザー体験）
1. ブラウザで自分のWordPressページ（例：`/diary`）を開く
2. 英語日記を入力して「保存」
3. 保存済みの日記を選んで「AIレビュー」
4. 画面に **修正文** と **別表現** と **改善ポイント** が出る
5. 「読み上げ」で音声再生
6. 「ランダム復習」で過去日記がランダムに表示され、読み上げできる

### 1.2 MVPの画面（最小）
- **Diaryページ**（1ページで完結）
  - 入力欄（英文）
  - 保存ボタン
  - 一覧（最新10件）
  - 詳細表示（原文・レビュー結果・読み上げ・AIレビュー実行）
  - ランダム復習ボタン

---

## 2. 全体の構造（どこで何をするか）
### 2.1 重要な約束：APIキーはブラウザに置かない
- OpenAIのAPIキーをJavaScript（ブラウザ側）に書くのは危険。
- だから **WordPress（サーバ側）でOpenAIを呼ぶ**。

### 2.2 役割分担
- **ブラウザ（JS）**：
  - 画面表示
  - 入力を受け取る
  - WordPressのREST APIを呼ぶ
  - 返ってきた結果を表示
  - 端末読み上げ（Web Speech API）

- **WordPressプラグイン（PHP）**：
  - 日記データの保存・取得（DB）
  - 生成AIレビューの実行（OpenAI API呼び出し）
  - REST APIを提供（`/wp-json/...`）
  - 認証・権限チェック（自分だけ使えるように制限）

- **DB（MariaDB）**：
  - 日記本文、レビュー結果、復習回数などを保存

---

## 3. 開発環境の前提（WSL + Docker + VS Code）
### 3.1 ディレクトリ構成（おすすめ）
プロジェクトの作業フォルダを1つ作り、そこに全て入れる。

例：`~/projects/diarycoach-wp/`
```
~/projects/diarycoach-wp/
  docker/
    docker-compose.yml
    .env.example
    .env   (Git管理しない)
  wp-content/
    plugins/
      diarycoach/
        diarycoach.php
        includes/
        assets/
          js/
          css/
        templates/
        readme.md
  docs/
    plan.md
    api.md
    prompt.md
```

### 3.2 Git管理の範囲
- Gitに入れる：
  - `docker/docker-compose.yml`
  - `wp-content/plugins/diarycoach/`（プラグイン一式）
  - `docs/`
- Gitに入れない：
  - `docker/.env`（APIキーなど）
  - DBデータ
  - WordPress本体（コンテナ内）

---

## 4. Docker構成（ローカルでWordPressを動かす）
### 4.1 コンテナ一覧
- `wordpress`：WordPress本体（PHP）
- `db`：MariaDB
- （任意）`phpmyadmin`：DB確認用

### 4.2 永続化（重要）
- `wp-content` をホスト（WSL側）の `wp-content/` にマウントする。
  - これにより、VS Codeで編集したプラグインが即座にWordPressに反映される。

### 4.3 代表的な起動/停止コマンド
- 起動：`docker compose up -d`
- 停止：`docker compose down`

### 4.4 ローカルURL
- 例：`http://localhost:8080`（ポートはcomposeで決める）

---

## 5. WordPressプラグイン方式（なぜプラグインか）
### 5.1 プラグインに入れる機能
1. DB（テーブル）作成
2. REST API（CRUD + review + random）
3. ショートコード（UIを表示するため）
4. JS/CSS（画面の動きと見た目）

### 5.2 テーマではなくプラグインにする理由
- 本番移行が簡単（プラグインをコピーして有効化するだけ）
- テーマ変更の影響を受けにくい

---

## 6. データ設計（DBに何を保存するか）
### 6.1 まずは「カスタムテーブル」推奨
理由：
- カスタム投稿タイプでもできるが、レビューJSONや復習回数などを扱うならテーブルの方が素直。

### 6.2 テーブル案（MVP）
- テーブル名：`{$wpdb->prefix}diarycoach_entries`（WordPressプレフィックスを動的に使用）
- カラム例：
  - `id`（BIGINT 自動採番）
  - `created_at`（DATETIME）
  - `updated_at`（DATETIME）
  - `original_text`（LONGTEXT）
  - `review_json`（LONGTEXT：JSON文字列）
  - `shadowing_count`（INT）
  - `last_shadowed_at`（DATETIME NULL）

### 6.3 AIレビューJSONの固定形
- 返すキーを固定する（後で別UI/別アプリに移しても扱えるようにする）。
```json
{
  "corrected": "...",
  "alternatives": ["..."],
  "notes": ["..."],
  "readAloud": "...",
  "reviewedAt": "2026-01-04T08:15:00+09:00"
}
```

---

## 7. REST API設計（ブラウザが叩く窓口）
### 7.1 認証（まずは最小でOK）
- 「WordPressにログインしている人だけ使える」
- これで“自分用”が成立する。

### 7.2 エンドポイント一覧（MVP）
#### 7.2.1 作成
- `POST /wp-json/diarycoach/v1/entries`
- 入力：`{ original_text: "..." }`
- 出力：`{ id, created_at, original_text, review_json, shadowing_count }`

#### 7.2.2 一覧
- `GET /wp-json/diarycoach/v1/entries?limit=10&offset=0`

#### 7.2.3 詳細
- `GET /wp-json/diarycoach/v1/entries/{id}`

#### 7.2.4 AIレビュー
- `POST /wp-json/diarycoach/v1/entries/{id}/review`
- 入力：`{}`（サーバ側で original_text を引く）
- 出力：review_json

#### 7.2.5 ランダム復習
- `GET /wp-json/diarycoach/v1/shadowing/random`
- ルール：
  - `review_json` があるものを優先
  - `shadowing_count` が少ないものを少し優先（軽い重み付け）

#### 7.2.6 復習ログ更新
- `POST /wp-json/diarycoach/v1/entries/{id}/shadowed`
- 動作：shadowing_count +1、last_shadowed_at 更新

---

## 8. 生成AIレビュー（OpenAI呼び出しの仕様）
### 8.1 実装場所
- WordPressプラグイン（PHP）側。
- 送信：`original_text`
- 受信：固定JSON（corrected/alternatives/notes/readAloud）

### 8.2 プロンプト方針（ルール）
- 意味を変えない
- 事実を追加しない
- だらだら説明しない（notesは短く）
- 出力は「指定したJSONのみ」

### 8.3 OpenAIモデル選定・管理
#### モデル推奨（MVP）
- **既定：gpt-4o-mini**
  - 速度・コスト効率に優れている
  - 英文レビュー用途には十分な品質
  - APIコスト最小化

- **切替候補：gpt-4.1（必要なら）**
  - より高品質な修正・提案を重視する場合
  - モデル名は設定変数化して後から差し替え可能に

#### APIキー管理（推奨手順）
1. OpenAI ダッシュボードでプロジェクトを作成
2. プロジェクト単位でAPIキーを生成
3. キーは **環境変数 `OPENAI_API_KEY`** のみで管理
   - `.env` に保存（Git管理しない）
   - `.env.example` には値を記載しない
4. **ブラウザ・モバイルには絶対に置かない**
   - WordPress（PHP）側でのみOpenAIを呼び出す
   - ブラウザはWP REST APIを呼ぶ（キーはWP側で管理）

#### 実装上の設定方法
```php
// wp-config.php または .env から読み込み
define( 'OPENAI_API_KEY', getenv( 'OPENAI_API_KEY' ) );
define( 'OPENAI_MODEL', get_option( 'diarycoach_ai_model', 'gpt-4o-mini' ) );
```

### 8.4 コスト制御（自分用でも入れる）
- 1回の最大文字数（例：3000文字）
- 1日の最大回数（例：50回）
- 失敗時のメッセージを分かりやすく

---

## 9. フロント（UI/JS）の作り方
### 9.1 技術選択：Vanilla JS + 自作CSS
#### なぜVanilla JSか
- **ビルド工程が不要**
  - Node/Webpack等を避ける→ WordPressプラグイン内最適化
  - 編集→ブラウザリロードで即座に反映
- **画面規模がシンプル**
  - 入力・一覧・詳細・レビュー表示・読み上げ程度なら十分
  - React/Vue の複雑性は不要

#### なぜ自作CSSか
- **CSS衝突リスクが小さい**
  - Tailwind/Bootstrap→ WordPressテーマ/他プラグインとの競合懸念
  - 自作で「diarycoach-」プレフィックスを付ければ隔離可能
- **ファイルサイズ最小化**
  - プラグイン内に閉じる → 不要なCSS読み込みなし
- **MVP段階では十分**
  - 見た目は後から調整できる

### 9.2 ショートコード方式
- WordPressの固定ページに `[diarycoach_app]` を貼る
- そのショートコードが「入力欄+ボタン+表示領域」のHTMLを出す
- HTMLにインライン化した小さなJSとCSSを含める

### 9.3 JSの役割
- ボタン押下でREST APIを呼ぶ（`fetch`）
- レスポンスをHTMLに反映
- 読み上げ（Web Speech API）
- Nonce検証（X-WP-Nonceヘッダ付与）

### 9.4 UIの最低限（MVP）
- textarea（入力欄）
- Save ボタン
- entries一覧（最新10件・クリックで詳細）
- Review ボタン（修正文・別表現・改善ポイント表示）
- Speak ボタン（Web Speech API）
- Random ボタン（ランダム復習）

### 9.5 ファイル構成
```
diarycoach/assets/
  js/
    diarycoach-app.js    （ファイルサイズ：<100KB 想定）
  css/
    diarycoach-app.css   （スタイルを"diarycoach-"で隔離）
```

---

## 10. 実装の順番（フェーズ別の具体手順）

## フェーズ0：環境を起動して「編集→反映」を作る
**目的**：VS Codeで書いたプラグインが、WordPressの管理画面で有効化できる。

手順：
1. Docker ComposeでWordPress+DBを起動
2. ブラウザでWP初期設定（管理者作成）
3. `wp-content/plugins/diarycoach/diarycoach.php` を作る（最小のプラグインヘッダ）
4. WP管理画面→プラグイン→有効化

合格条件：
- プラグインがエラーなく有効化できる

---

## フェーズ1：保存と表示（AIなし）
**目的**：日記を書いて保存し、一覧/詳細で見られる。

手順：
1. プラグイン有効化時にテーブル作成（dbDelta）
2. REST API：
   - `POST /entries`（保存）
   - `GET /entries`（一覧）
   - `GET /entries/{id}`（詳細）
3. ショートコードでUIを出す（入力＋保存＋一覧）
4. JSでRESTを叩いて画面更新

合格条件：
- 入力→保存→一覧に出る→詳細で原文が見える

---

## フェーズ2：AIレビュー連携
**目的**：ボタン1つでレビューが生成され、保存され、表示される。

手順：
1. OpenAI APIキーを環境変数で設定（.env→コンテナ）
2. REST API：`POST /entries/{id}/review`
3. サーバ側でOpenAI呼び出し→固定JSONで返す
4. `review_json` に保存
5. UIでcorrected/alternatives/notesを表示

合格条件：
- Reviewボタンで修正文が出て、ページ再読み込みしても残る

---

## フェーズ3：読み上げ + ランダム復習
**目的**：復習が回る。

手順：
1. Web Speech APIでSpeakを実装（corrected→readAloud優先）
2. REST API：
   - `GET /shadowing/random`
   - `POST /entries/{id}/shadowed`
3. ランダム表示→Speak→カウント更新

合格条件：
- ランダムで過去日記が表示され、読み上げでき、回数が増える

---

## フェーズ4：本番移行
**目的**：ローカルと同じものがクラウドのWordPressで動く。

手順：
1. 本番WPにプラグインをコピー/ZIPアップロード
2. APIキーを本番の安全な場所に設定（wp-config.php or 環境変数）
3. プラグイン有効化→テーブル作成
4. 動作確認
5. 必要ならデータ移行（後述）

合格条件：
- 本番URLで日記保存/レビュー/復習が同様に動く

---

## 11. データ移行（ローカル→本番）
### 11.1 最小（手動）
- ローカルで数十件なら、手動コピペでもよい（MVPの段階では割り切り可）

### 11.2 推奨（エクスポート/インポート）
- REST APIで
  - `GET /entries/export`（JSON一括）
  - `POST /entries/import`（JSON投入）
を用意して移行を自動化（MVP後）

---

## 12. セキュリティ（自分用でも最低限）
### 12.1 REST API認証：WordPress Cookie + Nonce
#### なぜこの方式か
- **WordPress標準の認証方式**
  - ログイン済みユーザーのCookie認証は標準で有効
  - CSRF対策にNonce検証を追加するだけで安全
- **実装最小化**
  - 外部JWT/OAuth プラグイン不要
  - Application Password は「将来のCLI/外部連携」で検討可能
- **同一オリジン利用に最適**
  - ブラウザが wp-json を呼ぶ → Cookie/Nonce 検証で十分

#### 実装方法
**PHP（ショートコード出力時）**
```php
wp_localize_script( 'diarycoach-app', 'diarycoachSettings', array(
    'nonce' => wp_create_nonce( 'wp_rest' )
) );
```

**JS（REST呼び出し時）**
```javascript
fetch( '/wp-json/diarycoach/v1/entries', {
    method: 'POST',
    headers: {
        'X-WP-Nonce': diarycoachSettings.nonce,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify( {...} )
} );
```

**PHP（エンドポイント内）**
```php
check_ajax_referer( 'wp_rest', 'X-WP-Nonce' );
```

### 12.2 その他のセキュリティ
- **ログインユーザーのみ許可**
  - REST エンドポイントで `'permission_callback' => function() { return is_user_logged_in(); }`
- **レート制限**
  - 1日あたりのAIレビュー回数（例：50回）を管理画面で設定可能に
  - user_meta で実行回数カウント
- **ログ管理**
  - 失敗時は原因が分かるようにエラーメッセージを用意
  - **ただしAPIキー/秘密情報は絶対にログに出さない**

---

## 13. 成果物一覧（最終的にリポジトリに残るもの）
1. `docker/docker-compose.yml`（ローカルWP起動）
2. `wp-content/plugins/diarycoach/`（プラグイン一式）
   - REST API
   - DBテーブル作成
   - ショートコードUI
   - JS/CSS
3. `docs/api.md`（API仕様）
4. `docs/prompt.md`（プロンプト仕様）
5. `docs/deploy.md`（本番移行手順）

---

## 14. 次に作るべき「詳細手順書」
この基本計画の次は、フェーズ0を「コマンドとファイル名つき」で手順化する。
- 例：
  - `docker-compose.yml` の完全例
  - プラグインの最小コード（有効化できる状態）
  - ショートコードを表示する最小コード
  - REST APIの最初の1本（保存）

---

## 15. DB保存方式：カスタムテーブル（確定）
### 選択理由
**推奨：カスタムテーブル**

**メリット**
- JSON（review結果）・回数・日時などの構造化データが素直に扱える
- 将来の拡張（ランダム復習の重み付け、集計、エクスポート等）がやりやすい
- DBクエリが明確で、パフォーマンス調整しやすい

**カスタム投稿タイプ（CPT）との比較**
- CPT + postmeta は後から複雑化しがち
  - metaクエリの癖
  - パフォーマンス（JOINが多くなる）
  - 扱いが複雑（reviewJSONの構造化が手数多い）
- CPTが向く条件
  - WordPressの標準UI（投稿一覧/検索/編集）を積極的に使いたい場合
  - DB設計を避けたい場合（ただし後で苦しくなる可能性あり）

**この用途（アプリっぽい挙動、review JSON、復習ロジック）なら、カスタムテーブルが安定**

---

## 16. OpenAIモデル選定（確定）
### 既定モデル：gpt-4o-mini
- **速度**：応答が速い
- **コスト**：低価格（MVP最適化）
- **品質**：英文レビュー・改善提案には十分

### 切替方法（設定可能に）
1. WordPress 管理画面で「DiaryCoach設定」ページを用意
2. モデル名を選択肢（gpt-4o-mini / gpt-4.1）で選べるように
3. `update_option( 'diarycoach_ai_model', $model )` で保存

### 将来の拡張性
- OpenAI がモデルを追加/廃止しても、定数参照なら対応簡単
- 設定オプションで「常に最新モデルを選べる」状態を作る

---

## 17. フロント技術スタック（確定）
### Vanilla JS + 自作CSS

**Vanilla JS を選んだ理由**
1. **ビルド工程が不要**
   - WordPressプラグイン内で完結
   - 編集→ブラウザリロードで即座に反映
   - デプロイも単純（ファイルコピーのみ）

2. **画面規模が適切**
   - 入力・一覧・詳細・レビュー表示・読み上げ程度
   - React/Vue の状態管理複雑性は不要
   - fetch + DOM操作で十分

**自作CSS を選んだ理由**
1. **CSS衝突リスク最小化**
   - Tailwind/Bootstrap → WordPressテーマ/他プラグインとの競合
   - 自作で「.diarycoach-」プレフィックスを付ければ隔離可能

2. **ファイルサイズ最適化**
   - 不要なCSSを読み込まない
   - プラグイン内に閉じる

3. **MVP段階では十分**
   - 見た目の凝った調整は後から可能

### 構成例
```
diarycoach/
  assets/
    js/
      diarycoach-app.js        （<100KB）
      lib/
        fetch-api.js           （REST呼び出し共通化）
        web-speech-api.js      （読み上げ共通化）
    css/
      diarycoach-app.css       （スタイル"diarycoach-"で隔離）
```

---

## 18. REST API認証方式（確定）
### WordPress Cookie + Nonce（X-WP-Nonce）

**なぜこれか**
- WordPress標準の認証方式
- 同一オリジン内での通信に最適
- ログイン済みユーザーのみアクセス許可

**実装パターン**

**PHP側**
```php
// 1. ショートコード出力時にNonceをJSに渡す
wp_localize_script( 'diarycoach-app', 'diarycoachSettings', array(
    'nonce' => wp_create_nonce( 'wp_rest' ),
    'apiUrl' => rest_url( 'diarycoach/v1' )
) );

// 2. エンドポイント登録時
register_rest_route( 'diarycoach/v1', '/entries', array(
    'methods' => 'POST',
    'callback' => 'diarycoach_create_entry',
    'permission_callback' => function() {
        check_ajax_referer( 'wp_rest', 'X-WP-Nonce' );
        return is_user_logged_in();
    }
) );
```

**JS側**
```javascript
fetch( diarycoachSettings.apiUrl + '/entries', {
    method: 'POST',
    headers: {
        'X-WP-Nonce': diarycoachSettings.nonce,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify( {original_text: '...'} )
} )
.then( r => r.json() )
.catch( err => console.error( err ) );
```

**将来の拡張**
- Application Password：CLI/外部連携が必要になったら検討
- JWT：外部SPA が必要になったら検討

---

## 19. プラグイン命名規則（確定）
### プラグイン Slug
`diarycoach`

### テーブル名
`{$wpdb->prefix}diarycoach_entries`

**なぜこうするか**
- WordPress環境によってプレフィックスが異なる（デフォルト `wp_`、本番では変わることもある）
- `wp_` を固定すると、プレフィックス変更時にテーブルが見つからない
- `$wpdb->prefix` を使えば、どの環境でも正しいテーブル名で生成される

### その他の命名
- ショートコード：`[diarycoach_app]`
- JavaScriptグローバル：`window.diarycoach` または `window.diarycoachSettings`
- CSS クラス：`.diarycoach-*`（他プラグイン/テーマとの衝突回避）
- REST ベース：`/wp-json/diarycoach/v1/`

---

## 20. ランダム復習ロジック（確定）
### アルゴリズム：重み付き抽選

#### ルール
1. **候補集合の優先度**
   - 優先：`review_json IS NOT NULL` のもの（AIレビュー済み）
   - フォールバック：全件（レビュー未対象もOK）

2. **重み付け計算**
   各候補 $i$ に対して、以下の重み $w_i$ を付ける：
   
   $$w_i = \frac{1}{1 + \text{shadowing\_count}_i}$$
   
   **なぜこの式か**
   - shadowing_count が少ないほど w が大きい（出やすい）
   - count = 0 なら w = 1（最高確率）
   - count が増えるほど w が減るが、ゼロにはならない（「完全に出ない」は避ける = 軽い優先）

3. **直近復習ペナルティ（任意）**
   last_shadowed_at が24時間以内なら、`w *= 0.3` で確率を下げる
   
4. **ルーレット選択**
   - 候補の重み合計：$W = \sum_i w_i$
   - 0 から W の間の乱数 r を生成
   - r までの累積重みが W に達する候補を選ぶ

#### PHP実装例（疑似コード）
```php
$candidates = $wpdb->get_results(
    "SELECT id, shadowing_count, last_shadowed_at 
     FROM {$table} 
     WHERE review_json IS NOT NULL 
     ORDER BY RAND() 
     LIMIT 100" // 一度に大量取得して、メモリで処理
);

$weights = array();
$total_weight = 0;
foreach ( $candidates as $c ) {
    $w = 1 / ( 1 + intval( $c->shadowing_count ) );
    
    // 直近復習なら下げる（任意）
    if ( strtotime( $c->last_shadowed_at ) > time() - 86400 ) {
        $w *= 0.3;
    }
    
    $weights[ $c->id ] = $w;
    $total_weight += $w;
}

// ルーレット選択
$random_value = mt_rand( 0, (int)( $total_weight * 1000 ) ) / 1000;
$cumulative = 0;
foreach ( $weights as $id => $w ) {
    $cumulative += $w;
    if ( $cumulative >= $random_value ) {
        return $id; // この id を返す
    }
}
```

#### なぜこれが「軽い優先」なのか
- 複雑な条件分岐がない（シンプル）
- 実装効率が良い（メモリ処理で十分）
- "復習が少ないものを少し優先"という要求を自然に表現
- 完全に「外れる」ことがない（どの候補も確率> 0）

---

## 21. 実装チェックリスト（最終確認用）
### 環境準備
- [ ] Docker Compose で WordPress + MariaDB 起動
- [ ] ブラウザで wp-admin にアクセス→ 管理者アカウント作成
- [ ] `.env` に OPENAI_API_KEY を設定
- [ ] `docker/.env.example` を作成（値なし）

### フェーズ0（環境確認）
- [ ] `wp-content/plugins/diarycoach/diarycoach.php` 作成（最小ヘッダ）
- [ ] プラグイン有効化を確認

### フェーズ1（保存・表示）
- [ ] カスタムテーブル作成（dbDelta）
- [ ] REST API 3本（作成・一覧・詳細）実装
- [ ] ショートコード実装
- [ ] JS で REST 呼び出し確認

### フェーズ2（AIレビュー）
- [ ] OpenAI API 呼び出し実装
- [ ] review_json 保存
- [ ] REST API：POST /entries/{id}/review 実装
- [ ] UI で修正文表示

### フェーズ3（読み上げ・復習）
- [ ] Web Speech API 実装
- [ ] REST API：GET /shadowing/random（重み付け実装）
- [ ] REST API：POST /entries/{id}/shadowed（カウント更新）
- [ ] UI でランダム表示・読み上げ・復習カウント確認

### 本番移行前
- [ ] セキュリティ監査（Nonce、認証、入力検証）
- [ ] エラーハンドリング（APIエラー、DB接続エラー等）
- [ ] パフォーマンステスト（ランダム復習のクエリ最適化）
- [ ] ドキュメント整備（API仕様、セットアップ手順）

---

## 22. プロジェクト固有設定（確定事項）
### 環境準備状況
- ✅ Docker Desktop/Engine：インストール済み
- ✅ OpenAI APIキー：取得済み

### ローカル環境設定
- **プロジェクトルートディレクトリ**：`/home/moi/diary/`
- **WordPressローカルURL**：`http://localhost:8020`（ポート8020）
- **データベース**：MariaDB（Docker Compose経由）

### 本番環境
- **デプロイ先**：レンタルサーバー（Phase 4で詳細設定）

### 開発フロー
- **Phase順序**：Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
- **Git運用**：各Phase完了時にコミット必須

### docker-compose.yml 設定値
```yaml
# ポート設定（確定）
wordpress:
  ports:
    - "8020:80"  # http://localhost:8020
```