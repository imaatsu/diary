# AIレビュープロンプト仕様

> このドキュメントは、OpenAI APIに送信するプロンプトの仕様を定義します。

---

## 1. 基本方針

### 1.1 目的
英語日記の原文を受け取り、以下を提供する:
- 文法・語彙・表現の修正
- 別の自然な表現候補
- 改善ポイントの説明
- 読み上げ用の最適化テキスト

### 1.2 制約
- **意味を変えない**: ユーザーの意図した内容を保持する
- **事実を追加しない**: 原文にない情報を補完しない
- **簡潔に**: 説明は短く要点を絞る
- **JSON固定**: 出力形式は厳密に守る

---

## 2. プロンプトテンプレート

### 2.1 システムプロンプト
```
You are an English writing coach specializing in diary entries. Your role is to:
1. Correct grammatical errors and improve word choice
2. Suggest alternative natural expressions
3. Provide brief, actionable improvement notes
4. Create an optimized version for read-aloud practice

Rules:
- Preserve the original meaning and intent
- Do not add facts or details not in the original text
- Keep notes concise (1-2 sentences each)
- Output ONLY valid JSON with no additional text
```

### 2.2 ユーザープロンプト
```
Review the following English diary entry and respond with JSON only:

{original_text}

Required JSON format:
{
  "corrected": "Grammatically correct version with improved word choice",
  "alternatives": ["Alternative expression 1", "Alternative expression 2"],
  "notes": ["Brief improvement point 1", "Brief improvement point 2"],
  "readAloud": "Optimized version for pronunciation practice"
}
```

---

## 3. 出力JSON仕様

### 3.1 固定形式
```json
{
  "corrected": "修正後の完全な文章（文法・語彙を改善）",
  "alternatives": [
    "別表現候補1",
    "別表現候補2"
  ],
  "notes": [
    "改善ポイント1（簡潔に）",
    "改善ポイント2（簡潔に）"
  ],
  "readAloud": "読み上げ用に最適化したテキスト（発音しやすさ重視）"
}
```

### 3.2 各フィールドの詳細

#### `corrected`
- **必須**: はい
- **型**: string
- **内容**: 文法エラーを修正し、より自然な語彙選択を行った完全な文章
- **例**: `"I had a productive day at work. I completed three important tasks."`

#### `alternatives`
- **必須**: はい
- **型**: array of strings
- **内容**: 原文と同じ意味を持つが、異なる表現方法の候補（2〜3個推奨）
- **例**:
  ```json
  [
    "Today was a highly productive workday, and I finished three key tasks.",
    "I accomplished three significant tasks at work today."
  ]
  ```

#### `notes`
- **必須**: はい
- **型**: array of strings
- **内容**: 改善ポイントの簡潔な説明（各1〜2文、2〜3個推奨）
- **例**:
  ```json
  [
    "Changed 'good day' to 'productive day' for more specific description",
    "Replaced 'did' with 'completed' for stronger verb choice"
  ]
  ```

#### `readAloud`
- **必須**: はい
- **型**: string
- **内容**: 発音練習用に最適化したテキスト（発音しやすさ、リズム、イントネーションを考慮）
- **例**: `"I had a productive day at work. I completed three important tasks."`
- **注**: 通常は `corrected` と同じだが、発音が難しい部分を簡略化する場合もある

---

## 4. モデル設定

### 4.1 推奨モデル
- **デフォルト**: `gpt-4o-mini`
  - 速度: 速い
  - コスト: 低い
  - 品質: 英文レビューには十分

### 4.2 代替モデル
- **高品質が必要な場合**: `gpt-4.1`
  - より洗練された修正・提案
  - コストは高め

### 4.3 パラメータ
```php
$params = array(
    'model' => 'gpt-4o-mini',
    'temperature' => 0.3,  // 一貫性重視
    'max_tokens' => 1000,  // レビュー結果に十分
    'response_format' => array( 'type' => 'json_object' )
);
```

---

## 5. エラーハンドリング

### 5.1 入力検証
- 最大文字数: 3000文字（コスト制御）
- 空文字チェック
- 不正文字の除去

### 5.2 API呼び出し失敗時
```json
{
  "error": true,
  "message": "Failed to generate review",
  "code": "api_error"
}
```

### 5.3 JSON解析失敗時
- APIレスポンスが不正なJSONの場合、再試行（最大2回）
- それでも失敗した場合はエラーを返す

---

## 6. 使用例

### 6.1 入力例
```
original_text: "Today I go to park and play soccer with friend. It was very fun and I happy."
```

### 6.2 期待される出力
```json
{
  "corrected": "Today I went to the park and played soccer with a friend. It was very fun and I was happy.",
  "alternatives": [
    "I visited the park today and enjoyed playing soccer with a friend.",
    "Today I had fun playing soccer with a friend at the park."
  ],
  "notes": [
    "Changed 'go' to 'went' for past tense consistency",
    "Added article 'a' before 'friend' and 'the' before 'park'",
    "Corrected 'I happy' to 'I was happy' (missing auxiliary verb)"
  ],
  "readAloud": "Today I went to the park and played soccer with a friend. It was very fun and I was happy."
}
```

---

## 7. 将来の拡張性

### 7.1 追加フィールド候補
- `difficulty_level`: 難易度評価（初級/中級/上級）
- `vocabulary_suggestions`: 語彙力向上のための推奨単語
- `grammar_focus`: 特に注意すべき文法ポイント

### 7.2 カスタマイズ可能項目
- ユーザーごとのレベル設定
- フォーマル/カジュアル度合いの調整
- 特定の文法項目へのフォーカス

---

## 8. セキュリティとプライバシー

### 8.1 APIキー管理
- 環境変数 `OPENAI_API_KEY` のみで管理
- ブラウザには絶対に露出しない
- WordPress（PHP）側でのみ使用

### 8.2 データ保護
- ユーザーの日記内容はOpenAIのデータ保持ポリシーに従う
- 本番環境では追加のプライバシー保護措置を検討

---

## 9. コスト制御

### 9.1 制限事項
- 1回あたり最大3000文字
- 1日あたり最大50回（user_metaで管理）
- レート制限超過時は明確なエラーメッセージ

### 9.2 モニタリング
- API呼び出し回数のログ記録
- コスト見積もりの提供（管理画面）

---

## 10. 更新履歴

| 日付 | 更新者 | 変更内容 |
|---|---|---|
| 2026-01-05 | Claude | 初版作成 |
