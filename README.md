# Booth Optimizer

Boothの検索を"ちょっと快適に"するChrome / Firefox拡張。

毎回同じ検索条件を設定したり、興味のないショップをスクロールで飛ばしたり、そういう地味なストレスを減らすために作りました。

[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/haru0416)

## 何ができる？

**検索プロファイル** — キーワード、タグ、在庫あり/新着/R-18フィルター、ソート順を保存。Boothを開くと自動で検索結果へ飛ばしてくれる。

**ショップブロック** — 興味のない店を非表示リストに入れると、以降その店の商品が一覧から消える。ショップページからワンクリックで追加/解除できる。

**無限スクロール** — ページ送りなしで次々読み込む。ブロック設定とも連動するので、非表示にしたショップの商品は途中で現れない。

**セクション非表示** — トップにある「カテゴリー」「最近チェックした作品」みたいな枠を消せる。商品一覧だけ見たいときに便利。

**価格トラッカー** — ウィッシュリストに入れた商品の価格変動を自動で監視。値下げやセールを見逃さない。

**トラッキング遮断** — Google Analytics、DoubleClick、OneSignalあたりのリクエストをブロック。

**その他** — 画像の遅延読み込み、サイドバー固定など細かい改善もいくつか。

## インストール

Chrome Web Store / Firefox Add-onsへの公開準備中。今はソースからビルドして使ってください。

```bash
bun install
bun run build          # Chrome向け
bun run build:firefox  # Firefox向け
```

ビルド後、`chrome://extensions`（Chrome）か`about:debugging`（Firefox）から`.output`内のフォルダを読み込めばOK。

## 使い方

拡張のアイコンをクリックするとポップアップが開く。

- 検索プロファイルの編集・オンオフ
- ブロック済みショップの確認・解除
- 無限スクロールや非表示セクションの切り替え
- 自動リダイレクトの有効化

設定はブラウザのストレージに同期保存されるので、別端末でも引き継がれる（sync非対応環境ではローカル保存）。

## 開発

```bash
bun install
bun run dev            # Chrome向け開発サーバ
bun run dev:firefox    # Firefox向け
```

WXTのHMRが効くので、コード変更は即座に反映される。

テストは`bun test:unit`（Vitest）と`bun test:e2e`（Playwright）。CIを通す前に`bun run validate`でまとめてチェックできる。

## 構成

```
src/
  entrypoints/     バックグラウンド、コンテンツスクリプト、ポップアップ
  features/        機能ごとのモジュール
  shared/          スキーマ、ユーティリティ
  i18n/            翻訳ファイル（日/英/韓/簡体字）
tests/
  unit/            ユニットテスト
  e2e/             E2Eテスト
```

## サポート

このプロジェクトが役に立ったら、コーヒー1杯おごってもらえると励みになります。

<a href="https://buymeacoffee.com/haru0416" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50">
</a>

## ライセンス

MIT
