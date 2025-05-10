# クイズサイト

このプロジェクトは HTML/CSS/JavaScript を使って構築されたシンプルな4択クイズサイトです。問題データは CSV ファイルから読み込まれ、ジャンルと難易度に応じて出題されます。

## 🔧 機能一覧

- ジャンル（7種類）と難易度（1〜5）を選んでクイズをスタート
- CSVファイルから問題を読み込み
- 1問ごとにタイマー（デフォルト10秒）付きで出題
- 正誤判定とスコア表示
- 「次の問題へ」ボタンで自分のタイミングで進行
- 中断ボタンで進捗保存
- ローカルストレージに問題ジャンル×難易度単位で進捗保存
- スタート時に「続きから or 最初から」の選択モーダル表示

## 📁 フォルダ構成

```
project-root/
├── index.html
├── style.css
├── script.js
├── data/
│   ├── config.yaml               # 設定ファイル（任意）
│   ├── animeandgame/MCQ_1.csv   # CSVファイル（例）
│   ├── sports/MCQ_2.csv         # ...他ジャンル＆難易度
```

## 📄 CSVファイル形式

1問につき4行、以下のような構成：

```
問題文, 選択肢1, 正解, , [画像or音声ファイルへのパス（任意）]
        , 選択肢2
        , 選択肢3
        , 選択肢4
```

- 選択肢の順番はランダムではなく指定順
- 画像/音声を有効にする場合は config.yaml 側で明示的に有効化

## ⚙️ 設定ファイル（config.yaml）

```yaml
time_limit: 10              # 問題ごとの制限時間（秒）
shuffle_questions: false   # 問題のシャッフル有無
enable_images: false       # 画像付き問題を有効にするか
enable_audio: false        # 音声付き問題を有効にするか
```

## 🚀 使い方

1. `data/ジャンル名/MCQ_レベル.csv` を用意
2. `index.html` をブラウザで開く
3. ジャンルとレベルを選び「スタート」
4. クイズを解き進める
5. 中断したい場合は「中断する」→再開時はモーダルから続き選択

## 🌐 他端末（iPad/iPhone等）でアクセスするには（ngrok使用）

1. 以下でローカルサーバーを起動：
   ```bash
   python3 -m http.server 8000 --bind 0.0.0.0
   ```

2. ngrok でローカルポート8000を外部公開：
   ```bash
   ngrok http 8000
   ```

3. 表示された `Forwarding` のURLを、iPadや他の端末のブラウザで開く：
   例：`https://xxxxxx.ngrok-free.app`

## 💾 進捗保存仕様

- `localStorage` に `progress_{genre}_{level}` 形式で保存：
  - `progress_sports_2_index` → 現在のインデックス
  - `progress_sports_2_score` → 現在のスコア

## 📦 依存ライブラリ

- [js-yaml](https://github.com/nodeca/js-yaml)（CDNで読み込み）

```html
<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
```

## 📝 備考

- 画像は `/data/ジャンル名/images/` 以下などで管理を推奨
- 音声ファイルは `.mp3` のみ対応

---

ご質問や機能追加の提案があればお気軽に！
