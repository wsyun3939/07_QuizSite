# クイズサイト

このプロジェクトは HTML/CSS/JavaScript を使って構築されたシンプルなクイズサイトです。  
**4択問題**と**グループ分け問題**の2形式に対応しており、問題データは CSV ファイルから読み込まれ、ジャンルと難易度に応じて出題されます。

---

## 🔧 機能一覧

- ジャンル（7種類）と難易度（1〜5）を選択可能
- 問題形式（4択 / グループ分け）を選択可能
- CSVファイルから問題データを読み込み
- タイマー付き出題（デフォルト10秒、config.yamlで設定可）
- 正誤判定とスコア表示
- 次の問題へは自分のタイミングで進行
- **4択問題のみ**中断ボタンで進捗保存（ローカルストレージ使用）
- スタート時に「続きから / 最初から」のモーダル表示（4択のみ）
- グループ分け問題はドラッグ＆ドロップによる分類形式

---

## 📁 フォルダ構成

```
project-root/
├── index.html               # スタート画面（形式選択）
├── style.css               # index画面のスタイル
├── script.js               # MCQ/GROUP選択後のリダイレクト処理
├── data/
│   ├── config.yaml         # オプション設定ファイル
│   └── {genre}/
│       ├── MCQ_{lv}.csv    # 4択問題CSV
│       └── GROUP_{lv}.csv  # グループ分け問題CSV
├── mcq_quiz/
│   ├── mcq_quiz.html       # 4択クイズ画面
│   ├── mcq_quiz.js
│   └── mcq_quiz.css
└── group_quiz/
    ├── group_quiz.html     # グループ分けクイズ画面
    ├── group_quiz.js
    └── group_quiz.css
```

---

## 📄 CSVファイル形式

### 🔹 4択問題（MCQ）

1問につき4行、次のような構成：

```
問題文, 選択肢1, 正解, , [画像or音声ファイルへのパス（任意）]
        , 選択肢2
        , 選択肢3
        , 選択肢4
```

- 選択肢の順番はファイル順（シャッフルは `config.yaml` で設定）
- 画像/音声を有効にするには `enable_images` / `enable_audio` を有効にする

---

### 🔹 グループ分け問題（GROUP）

複数の分類セットを含む形式：

```
グループ数,N
グループ名1, 選択肢1, 選択肢2, ...
グループ名2, 選択肢1, 選択肢2, ...
...
```

例：

```
グループ数,2
果物,りんご,バナナ,みかん
野菜,にんじん,キャベツ,だいこん
```

---

## ⚙️ 設定ファイル（`data/config.yaml`）

```yaml
time_limit: 10              # 各問題の制限時間（秒）
shuffle_questions: false   # 問題のシャッフル有無
enable_images: false       # 画像付き問題を有効にするか
enable_audio: false        # 音声付き問題を有効にするか
```

---

## 🚀 使い方

1. `data/{ジャンル}/MCQ_レベル.csv` または `GROUP_レベル.csv` を用意
2. `index.html` をブラウザで開く
3. ジャンル・難易度・形式を選択して「▶ スタート」
4. クイズが開始される（4択 or グループ分け）
5. 4択のみ：中断可能＆再開時モーダルあり

---

## 💾 進捗保存仕様（※4択問題のみ）

- `localStorage` に `progress_{genre}_{level}` 形式で保存
  - `progress_sports_2_index` → 現在のインデックス
  - `progress_sports_2_score` → 現在のスコア

※ グループ分け問題には中断・保存機能は未実装です

---

## 🌐 他端末（iPad/iPhone等）でアクセスするには（ngrok使用）

1. ローカルサーバー起動：
   ```bash
   python3 -m http.server 8000 --bind 0.0.0.0
   ```

2. ngrokで公開：
   ```bash
   ngrok http 8000
   ```

3. `Forwarding` に表示されたURLを別端末のブラウザで開く：
   例：`https://xxxxxx.ngrok-free.app`

---

## 📦 依存ライブラリ

- [js-yaml](https://github.com/nodeca/js-yaml)（設定読み込み用）

```html
<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
```

---

## 📝 備考

- 画像は `/data/{ジャンル}/images/` 以下などで整理推奨
- 音声ファイルは `.mp3` のみ対応
- CSVの文字コードは **UTF-8** を推奨

---

ご質問・機能追加のご希望があればお気軽にどうぞ！
