<language>Japanese</language>
<character_code>UTF-8</character_code>
<law>
AI運用5原則
 第1原則:AIは、ファイル生成・更新・プログラム実行前に必ず以下を遵守する。
  　1-1. 実行内容の詳細プランを人間に報告する
  　1-2.「承認いただければ実行いたします」等の明示的承認要求を行う
  　1-3. 人間から「承認する」「実行してよい」等の明示的承認を得る
  　1-4. 承認が得られるまで一切の実行を禁止する
  　1-5. 分析・評価・提案は承認に含まれず、実行には別途承認が必要
第2原則:エラーやバグ等の問題が発生した場合は、関連ファイルを広く調査する。その際、`docs/debug_log.md`で過去の修正履歴を確認し、過去の修正に競合・影響しないか確認すること。
第3原則:コードを新たに記述、または既存のコードを修正したら、`docs/debug_log.md`にその記録を追記すること。
第4原則:エラーやバグ等の修正をしても同じ事象が発生する場合は、問題の切り分け作業を提案すること。
第5原則:AIは全てのチャットの冒頭にこの5原則を逐語的に必ず画面出力してから対応する。
</law>

<every_chat>
[AI運用5原則]

[main_output]

#[n] times. # n = increment each chat, end line, etc(#1, #2...)
</every_chat>

# このプロジェクトのお約束

## 絶対に守ること
1. 🚨 作業前にimplementation_plan.mdを見る
2. 🚨 Phase順序を守る（Phase1→Phase2→Phase3）
3. 🚨 勝手に機能を変えない
4. 🚨 プロジェクト全体の進捗を把握する
5. 🚨 APIキー等の機密情報はコードに直接書かず、設定ファイルや環境変数から読み込む
6. 🚨 終わったらwork_status.mdを更新して報告する
7. 🚨 **Phase完了時のGit操作**: 各Phase（0.x含む）完了時は必ず `git add .` と `git commit` を自動実行する
8. 🚨 **【最重要】人間の明示的な承認なしに、いかなるコーディング（新規作成・修正・削除）も行わない**
9. 🚨 **人間とのコミュニケーションは日本語で行うこと**

---
## デバッグ・修正の絶対ルール

1.  🚨 **事前確認**: 修正作業前には、必ず`docs/debug_log.md`で対象ファイルの修正履歴を確認すること。
2.  🚨 **履歴の保持**: `docs/debug_log.md`に記録されている過去の全修正内容は、絶対に保持し、削除しないこと。
3.  🚨 **部分修正の徹底**: ファイル全体の書き換えは厳禁とし、変更が必要な箇所のみを修正すること。
4.  🚨 **作業後の記録**: 修正が完了したら、必ず`docs/debug_log.md`に今回の修正内容を追記すること。
5.  🚨 **統合テスト**: 新旧すべての修正が、互いに影響せず同時に正常動作することをテストで確認すること。
6.  🚨 **ログ未存在時の対応**: `docs/debug_log.md`が存在しない場合、AIは作業を中断し、人間にファイルの作成を要求すること（AIによる勝手な作成は禁止）。
---

## Phase完了時のGit操作手順

### 自動実行タイミング
- **Phase 0.x**: 各サブフェーズ完了時（0.1, 0.2, 0.3, ... 0.11）
- **Phase 1.x**: 各サブフェーズ完了時（1.1, 1.2, ... 1.9）
- **Phase 2.x**: 各サブフェーズ完了時（2.1, 2.2, 2.3, 2.4）
- **Phase 3.x**: 各サブフェーズ完了時（3.1, 3.2, 3.3, 3.4, 3.5）

### 必須実行コマンド
1. **ステージング**: `git add .` または関連ファイルの個別追加
2. **コミット**: 統一フォーマットでのコミットメッセージ

### コミットメッセージフォーマット
```
feat: complete Phase [X.Y] [タスク名]

- [主要な成果物・変更内容]
- [重要な発見事項や課題]
- [生成したファイル名]
- Updated project progress: Phase [X] now [Y]% complete ([完了数]/[総数] tasks)

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 例
```bash
git add docs/dependency_risk_analysis.md docs/dependency_risk_data.json docs/risk_mitigation_actions.csv docs/work_status.md
git commit -m "$(cat <<'EOF'
feat: complete Phase 0.7 dependency and risk analysis

- Comprehensive OnePress migration risk assessment completed
- Identified critical risks: Elementor compatibility, plugin conflicts
- Generated 3 risk analysis reports (MD/JSON/CSV formats)
- Updated project progress: Phase 0 now 64% complete (7/11 tasks)

Key findings:
- Elementor data corruption risk (15% probability, critical impact)
- Plugin conflict site crash risk (20% probability, high impact)
- Performance degradation likely (40% probability, medium impact)

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Available Skills

| Skill | When to Use |
|-------|-------------|
| orama-integration | Integrating with Orama search/indexing |
| frontend-design | Creating web components, pages, dashboards, React components, HTML/CSS layouts, or any frontend interface requiring high design quality and distinctive aesthetics |

---

## Playwright MCP使用ルール

### 絶対的な禁止事項
1. いかなる形式のコード実行も禁止（Python、JavaScript、Bash等でのブラウザ操作は行わない）
2. 利用可能なのはMCPツールの直接呼び出しのみ（例: playwright:browser_navigate, playwright:browser_screenshot）
3. エラー時は回避策を探さず、即座にエラーメッセージをそのまま報告すること

