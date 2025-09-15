// mcq_quiz.js
/* =========================
   状態
========================= */
let questions = [];               // {question, choicesOriginal[...], correct}
let timer = null;

const els = {
  question:  document.getElementById("question"),
  choices:   document.getElementById("choices"),
  feedback:  document.getElementById("feedback"),
  score:     document.getElementById("score"),
  timer:     document.getElementById("timer"),
  next:      document.getElementById("next-button"),
  pause:     document.getElementById("pause-button"),
  modal:     document.getElementById("modal"),
  resumeBtn: document.getElementById("resumeBtn"),
  restartBtn:document.getElementById("restartBtn"),
};

// クエリ
const params = new URLSearchParams(window.location.search);
const genre  = params.get("genre") || "animeandgame";
const level  = params.get("level") || "1";

// 設定（config.yaml が読めなければ fallback）
let config = { time_limit: 10 };

/* =========================
   進捗（localStorage）
========================= */
function keyBase(){ return `progress_${genre}_MCQ_${level}`; }

const storage = {
  save(state){
    const base = keyBase();
    localStorage.setItem(`${base}_index`, String(state.index));
    localStorage.setItem(`${base}_score`, String(state.score));
    localStorage.setItem(`${base}_order`, JSON.stringify(state.order));
    localStorage.setItem(`${base}_choiceOrder`, JSON.stringify(state.choiceOrder));
    localStorage.setItem(`${base}_timeLeft`, String(state.timeLeft));
    // データ検証用に問題数も保存
    localStorage.setItem(`${base}_qCount`, String(questions.length));
  },
  load(){
    const base = keyBase();
    const index  = Number(localStorage.getItem(`${base}_index`));
    const score  = Number(localStorage.getItem(`${base}_score`));
    const order  = JSON.parse(localStorage.getItem(`${base}_order`) || "null");
    const choiceOrder = JSON.parse(localStorage.getItem(`${base}_choiceOrder`) || "null");
    const timeLeft = Number(localStorage.getItem(`${base}_timeLeft`));
    const qCount  = Number(localStorage.getItem(`${base}_qCount`));
    const exists  = localStorage.getItem(`${base}_index`) !== null;

    return { exists, index, score, order, choiceOrder, timeLeft, qCount };
  },
  clear(){
    const base = keyBase();
    ["_index","_score","_order","_choiceOrder","_timeLeft","_qCount"].forEach(suffix=>{
      localStorage.removeItem(`${base}${suffix}`);
    });
  }
};

// セッション状態（メモリ上）
const session = {
  index: 0,
  score: 0,
  timeLeft: 10,
  order: [],          // 出題順: グローバルindexの配列
  choiceOrder: {},    // { [qIndex]: [0..n-1] の並び }
  answered: false
};

/* =========================
   初期化
========================= */
window.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();

  try {
    await loadCSV();
  } catch (e) {
    alert("CSVの読み込みに失敗しました。");
    console.error(e);
    return;
  }

  // 進捗があり、かつ問題数が合致する場合のみ「続き」選択を出す
  const saved = storage.load();
  const canResume = saved.exists && saved.qCount === questions.length;

  if (canResume) {
    openModal(true);
  } else {
    // 進捗が壊れていたら削除して新規開始
    if (saved.exists) storage.clear();
    startNew();
    renderCurrent();
  }
});

/* =========================
   設定読込
========================= */
async function loadConfig() {
  try {
    const res = await fetch("../../data/config.yaml");
    const text = await res.text();
    config = jsyaml.load(text) || { time_limit: 10 };
  } catch (e) {
    console.warn("config.yaml の読み込みに失敗。デフォルト値を使用します。");
  }
}

/* =========================
   データ読込（CSV）
   - 4行1問 or 1行1問 の両対応
========================= */
async function loadCSV() {
  const path = `../../data/${genre}/MCQ_${level}.csv`;
  const res = await fetch(path);
  if (!res.ok) throw new Error("CSVファイルが見つかりません");
  const text = await res.text();
  parseCSV(text);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  questions = [];

  // 1行1問（問題, 選1, 選2, 選3, 選4, 正解）判定
  const hasOneLine = lines.some(l => l.split(",").length >= 6);

  if (hasOneLine) {
    for (const line of lines) {
      const cells = line.split(",").map(s=>s.trim());
      if (cells.length < 6) continue;
      const [q, c1, c2, c3, c4, correct] = cells;
      questions.push({
        question: q,
        choicesOriginal: [c1, c2, c3, c4],
        correct
      });
    }
  } else {
    // 4行1問ブロック
    for (let i = 0; i + 3 < lines.length; i += 4) {
      const head = lines[i].split(",").map(s=>s.trim());
      const opt2 = lines[i+1].split(",")[1]?.trim() || "";
      const opt3 = lines[i+2].split(",")[1]?.trim() || "";
      const opt4 = lines[i+3].split(",")[1]?.trim() || "";
      if (!head[0] || !head[1] || !head[2]) continue;

      questions.push({
        question: head[0],
        choicesOriginal: [head[1], opt2, opt3, opt4],
        correct: head[2]
      });
    }
  }
}

/* =========================
   開始・再開
========================= */
function startNew() {
  session.index = 0;
  session.score = 0;
  session.timeLeft = config.time_limit || 10;
  session.order = shuffle([...Array(questions.length).keys()]); // 0..n-1
  session.choiceOrder = {}; // 各問題ごとの選択肢並びは描画時に決める
  storage.save(session);
}

function resumeSaved() {
  const saved = storage.load();
  if (!saved.exists || saved.qCount !== questions.length) {
    // 安全のため新規
    startNew();
    return;
  }
  session.index = Number.isFinite(saved.index) ? saved.index : 0;
  session.score = Number.isFinite(saved.score) ? saved.score : 0;
  session.timeLeft = Number.isFinite(saved.timeLeft) && saved.timeLeft > 0 ? saved.timeLeft : (config.time_limit || 10);
  session.order = Array.isArray(saved.order) && saved.order.length === questions.length
    ? saved.order
    : shuffle([...Array(questions.length).keys()]);
  session.choiceOrder = (saved.choiceOrder && typeof saved.choiceOrder === "object")
    ? saved.choiceOrder
    : {};
  // 範囲補正
  if (session.index < 0) session.index = 0;
  if (session.index >= session.order.length) session.index = session.order.length - 1;
}

function openModal(show){
  // hidden 属性と display の両方に対応（マークアップ差異を吸収）
  if (!els.modal) return;
  if (show) {
    if ('hidden' in els.modal) els.modal.hidden = false;
    els.modal.style.display = els.modal.style.display || "flex";
  } else {
    if ('hidden' in els.modal) els.modal.hidden = true;
    els.modal.style.display = "none";
  }
}

els.resumeBtn?.addEventListener("click", ()=>{
  openModal(false);
  resumeSaved();
  renderCurrent();
});
els.restartBtn?.addEventListener("click", ()=>{
  openModal(false);
  storage.clear();
  startNew();
  renderCurrent();
});

/* =========================
   表示・進行
========================= */
function renderCurrent(){
  clearInterval(timer);
  session.answered = false;

  // 範囲外なら終了
  if (session.index >= session.order.length) {
    return endQuiz();
  }

  const qIndex = session.order[session.index];
  const q = questions[qIndex];

  // 問題文
  els.question.textContent = q.question;

  // 選択肢の表示順（保存されていなければ作成）
  const order = ensureChoiceOrder(qIndex, q.choicesOriginal.length);
  els.choices.innerHTML = '';
  order.forEach((origIdx, i)=>{
    const btn = document.createElement('button');
    btn.type = "button";
    btn.textContent = q.choicesOriginal[origIdx];
    btn.dataset.choiceIndex = String(origIdx); // 元のインデックス
    btn.addEventListener('click', ()=> handleAnswer(btn, q));
    els.choices.appendChild(btn);
  });

  // フィードバック/スコア
  els.feedback.textContent = '';
  els.score.textContent = `スコア: ${session.score}`;
  // 「次へ」は隠す
  setNextVisible(false);

  // タイマー
  session.timeLeft = Number.isFinite(session.timeLeft) ? session.timeLeft : (config.time_limit || 10);
  els.timer.textContent = `残り時間: ${session.timeLeft}秒`;
  timer = setInterval(()=>{
    session.timeLeft--;
    els.timer.textContent = `残り時間: ${session.timeLeft}秒`;
    if (session.timeLeft <= 0) {
      clearInterval(timer);
      lockChoices();
      els.feedback.textContent = `時間切れ！ 正解: ${q.correct}`;
      setNextVisible(true);
      // 進捗保存（この時点の index/score/timeLeft=0）
      storage.save(session);
    }
  }, 1000);

  // 表示のたびに保存（異常終了でもResumeできるように）
  storage.save(session);
}

function ensureChoiceOrder(qIndex, len){
  if (!Array.isArray(session.choiceOrder[qIndex])) {
    const arr = [...Array(len).keys()];
    session.choiceOrder[qIndex] = shuffle(arr);
    storage.save(session);
  }
  return session.choiceOrder[qIndex];
}

function handleAnswer(btn, q){
  if (session.answered) return;
  session.answered = true;
  clearInterval(timer);

  const selectedText = btn.textContent;
  const isCorrect = selectedText === q.correct;

  if (isCorrect) {
    els.feedback.textContent = '◯ 正解！';
    session.score++;
  } else {
    els.feedback.textContent = `× 不正解！ 正解: ${q.correct}`;
  }
  els.score.textContent = `スコア: ${session.score}`;

  // 他の選択肢をロック
  lockChoices(selectedText, q.correct);

  // 「次へ」表示
  setNextVisible(true);

  // 進捗保存（解答後）
  session.timeLeft = config.time_limit || 10; // 次問の準備として初期化して保存
  storage.save(session);
}

function lockChoices(selectedText=null, correctText=null){
  const buttons = els.choices.querySelectorAll('button');
  buttons.forEach(b=>{
    b.disabled = true;
    if (correctText && b.textContent === correctText) {
      b.classList.add('correct'); // 必要ならCSSで .correct { background:#0a7; } など
    }
    if (selectedText && b.textContent === selectedText && selectedText !== correctText) {
      b.classList.add('wrong'); // .wrong { background:#d33; }
    }
  });
}

function setNextVisible(v){
  if ('hidden' in els.next) els.next.hidden = !v;
  else els.next.style.display = v ? 'inline-block' : 'none';
}

els.next.addEventListener("click", ()=>{
  session.index++;
  session.timeLeft = config.time_limit || 10;
  storage.save(session);
  renderCurrent();
});

els.pause.addEventListener("click", ()=>{
  // 現在の残り時間を保存して中断
  storage.save(session);
  alert("進捗を保存しました");
  window.location.href = "../index.html";
});

// タブを閉じる/リロードでも進捗を保持
window.addEventListener('beforeunload', ()=>{
  storage.save(session);
});

/* =========================
   終了
========================= */
function endQuiz(){
  clearInterval(timer);
  els.question.textContent = '終了！お疲れさまでした';
  els.choices.innerHTML = '';
  els.feedback.textContent = `最終スコア: ${session.score} / ${questions.length}`;
  els.timer.textContent = '';
  setNextVisible(false);
  // 終了時は進捗クリア（次回は最初から）
  storage.clear();
}

/* =========================
   ユーティリティ
========================= */
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

/* =========================
   キーボードショートカット
   1〜4: 選択 / Enter: 次へ
========================= */
document.addEventListener('keydown', (e)=>{
  if (e.repeat) return;
  const key = e.key;
  if (/^[1-4]$/.test(key)) {
    const idx = Number(key) - 1;
    const btn = els.choices.querySelectorAll('button')[idx];
    if (btn && !btn.disabled) btn.click();
  } else if (key === 'Enter') {
    // 次へボタンが出ている時だけ有効
    const visible = ('hidden' in els.next) ? !els.next.hidden : els.next.style.display !== 'none';
    if (visible) els.next.click();
  }
});
