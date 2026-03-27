# multi-agent-prd-generator

5エージェントパイプラインでPRDを自動生成するプロジェクト。
マルチエージェントハーネス設計の学習が目的。

## エージェント構成

1. Researcher → outputs/01_research.md
2. Planner → outputs/02_outline.md
3. Generator → outputs/03_prd_draft.md
4. Critic → outputs/04_critique.md
5. Refiner → outputs/05_final_prd.md

## 参考

https://www.anthropic.com/engineering/harness-design-long-running-apps

## 開発フロー

- Issueごとにブランチを切る: `feature/issue-{番号}-{短い説明}`
- 実装完了後は `gh pr create` でPRを作成する
- PRのタイトルはIssue番号を含める: `fix: #1 Project setup`

## 重要

PRを作成したら必ず止まり、マージは行わないこと。
マージは人間が行う。
