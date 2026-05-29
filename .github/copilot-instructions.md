# Project Overview
このプロジェクトは、React Flowを使用したマインドマップWebアプリケーションです。
PCではキーボード中心の高速な操作、スマートフォンではタッチ操作に最適化されたUIを提供します。また、作成したマインドマップをEmacsの `org-mode` 形式でエクスポートする独自の機能を持ちます。

# Tech Stack
- **Framework**: React (Vite)
- **Language**: TypeScript (厳格な型チェックを有効化)
- **Core Library**: React Flow (ノードとエッジの描画)
- **State Management**: Zustand (React Flowの状態管理として推奨)
- **Styling**: Tailwind CSS (または標準のCSS Modules)
- **Hosting**: Cloudflare Pages

# Coding Guidelines
## General Rules
- 常にTypeScriptを使用し、`any`の使用は極力避けて適切なインターフェースや型を定義してください。
- Reactコンポーネントは関数コンポーネント（Functional Components）で記述し、Hooksを活用してください。
- パフォーマンスを意識し、不要な再レンダリングを防ぐために必要に応じて `useMemo` や `useCallback` を使用してください。

## Feature-Specific Guidelines
- **マインドマップ構造**: データは常に「ルートノードを頂点としたツリー構造」として扱えるように、フラットなノード配列とエッジ配列を管理・変換するロジックを意識してください。
- **キーボード操作**: PC向けのショートカット（Tabで子ノード追加、Enterで兄弟ノード追加など）を実装する際は、ブラウザのデフォルト挙動の制御（`e.preventDefault()`）に注意を払ってください。
- **org-mode連携**: ツリー構造を深さベースのテキスト（`*`, `**`, `***`）に再帰的にパースする純粋関数を分離して実装してください。
- **レスポンシブデザイン**: PCとモバイルで操作体系が異なるため、画面サイズやタッチデバイスの判定ロジックを適切に分離し、UIを切り替えられるようにしてください。
