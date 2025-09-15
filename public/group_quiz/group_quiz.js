// group_quiz.js
/* =========================
   状態
========================= */
let quizzes = []; // [{question, groupSet:[{name, items:[]}, ...]}]

const els = {
  container:   document.getElementById("quizContainer"),
  message:     document.getElementById("message"),
  timer:       document.getElementById("timer"),
  nextBtn:     document.getElementById("nextBtn"),
  pauseBtn:    document.getElementById("pauseBtn"),
  backBtn:     document.getElementById("backToTopBtn"),
  modal:       document.getElementById("modal"),
  resumeBtn:   document.getElementById("resumeBtn"),
  restartBtn:  document.getElementById("restartBtn"),
};

// クエリ
const params = new URLSearchParams(location.search);
const genre = params.get("genre") || "animeandgame";
const level = params.get("level") || "1";
const type  = "GROUP";

// 設定（config.yaml 失敗時のフォールバック）
let config = { time_limit: 10 };

// セッション状態（メモリ保持）
const session = {
  index: 0,
  score: 0,
  timeLeft: 10,
  order: [],         // 出題順（クイズ配列のインデックス）
  itemOrder: {},     // 各クイズのアイテム並び（未配置エリアの初期順）
  answered: false,
  ticker: null,      // setInterval ID
};

/* =========================
   ユーティリティ
========================= */
function keyBase(){ return `progress_${genre}_${type}_${level}`; }

const storage = {
  save(){
    const base = keyBase();
    localStorage.setItem(`${base}_index`, String(session.index));
    localStorage.setItem(`${base}_score`, String(session.score));
    localStorage.setItem(`${base}_order`, JSON.stringify(session.order));
    localStorage.setItem(`${base}_itemOrder`, JSON.stringify(session.itemOrder));
    localStorage.setItem(`${base}_timeLeft`, String(session.timeLeft));
    localStorage.setItem(`${base}_qCount`, String(quizzes.length));
  },
  load(){
    const base = keyBase();
    const exists = localStorage.getItem(`${base}_index`) !== null;
    const index  = Number(localStorage.getItem(`${base}_index`));
    const score  = Number(localStorage.getItem(`${base}_score`));
    const order  = JSON.parse(localStorage.getItem(`${base}_order`) || "null");
    const itemOrder = JSON.parse(localStorage.getItem(`${base}_itemOrder`) || "null");
    const timeLeft = Number(localStorage.getItem(`${base}_timeLeft`));
    const qCount   = Number(localStorage.getItem(`${base}_qCount`));
    return { exists, index, score, order, itemOrder, timeLeft, qCount };
  },
  clear(){
    const base = keyBase();
    ["_index","_score","_order","_itemOrder","_timeLeft","_qCount"].forEach(s=> localStorage.removeItem(`${base}${s}`));
  }
};

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

function setHidden(el, v){
  if(!el) return;
  if('hidden' in el) el.hidden = v;
  else el.style.display = v ? 'none' : '';
}

function clearTicker(){
  if(session.ticker){ clearInterval(session.ticker); session.ticker = null; }
}

/* =========================
   初期化
========================= */
window.addEventListener("DOMContentLoaded", async ()=>{
  await loadConfig();

  try{
    await loadCSV();
  }catch(e){
    alert("CSVの読み込みに失敗しました。");
    console.error(e);
    return;
  }

  const saved = storage.load();
  const canResume = saved.exists && saved.qCount === quizzes.length;
  if(canResume){
    openModal(true);
  }else{
    if(saved.exists) storage.clear(); // データ変更時の安全策
    startNew();
    renderCurrent();
  }
});

async function loadConfig(){
  try{
    const res = await fetch("../../data/config.yaml");
    const text = await res.text();
    config = jsyaml.load(text) || { time_limit: 10 };
  }catch(e){
    console.warn("config.yaml の読み込みに失敗。デフォルトを使用します。");
  }
}

async function loadCSV(){
  const path = `../../data/${genre}/GROUP_${level}.csv`;
  const res = await fetch(path);
  if(!res.ok) throw new Error("CSVが見つかりません");
  const text = await res.text();
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).filter(l=> !/^#|^\/\//.test(l));
  quizzes = parseQuizzes(lines);
}

function parseQuizzes(lines){
  const out = [];
  let i = 0;
  while(i < lines.length){
    const question = (lines[i++] || "").trim();
    if(!question) continue;

    if(i >= lines.length) break;
    const grpLine = lines[i++]; // 例: "グループ数,3"
    const m = grpLine.match(/グループ数\s*,\s*(\d+)/);
    const count = m ? parseInt(m[1], 10) : 0;
    if(!Number.isInteger(count) || count <= 0){ continue; }

    const groupSet = [];
    for(let j=0; j<count && i<lines.length; j++, i++){
      const cells = lines[i].split(",").map(s=>s.trim()).filter(Boolean);
      if(cells.length === 0) continue;
      const name = cells[0] || `グループ${j+1}`;
      const items = cells.slice(1);
      groupSet.push({ name, items });
    }
    if(groupSet.length > 0) out.push({ question, groupSet });
  }
  return out;
}

/* =========================
   開始・再開
========================= */
function startNew(){
  session.index = 0;
  session.score = 0;
  session.timeLeft = config.time_limit || 10;
  session.order = shuffle([...Array(quizzes.length).keys()]);
  session.itemOrder = {}; // 各問で未配置エリアに並べる順番
  storage.save();
}

function resumeSaved(){
  const saved = storage.load();
  session.index = Number.isFinite(saved.index) ? saved.index : 0;
  session.score = Number.isFinite(saved.score) ? saved.score : 0;
  session.timeLeft = Number.isFinite(saved.timeLeft) && saved.timeLeft > 0 ? saved.timeLeft : (config.time_limit || 10);
  session.order = Array.isArray(saved.order) && saved.order.length === quizzes.length
    ? saved.order
    : shuffle([...Array(quizzes.length).keys()]);
  session.itemOrder = (saved.itemOrder && typeof saved.itemOrder === "object")
    ? saved.itemOrder
    : {};
  // 範囲補正
  if(session.index < 0) session.index = 0;
  if(session.index >= session.order.length) session.index = session.order.length - 1;
}

function openModal(show){
  setHidden(els.modal, !show);
  if(show && els.modal && !els.modal.style.display) els.modal.style.display = "flex"; // 既存のスタイル互換
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
   描画
========================= */
function renderCurrent(){
  session.answered = false;
  clearTicker();

  if(session.index >= session.order.length){
    return showFinalResult();
  }

  const qIdx = session.order[session.index];
  const quiz = quizzes[qIdx];

  // リセット
  els.container.innerHTML = "";
  els.message.textContent = "";
  setHidden(els.nextBtn, true);
  setHidden(els.backBtn, true);

  // タイマー
  session.timeLeft = Number.isFinite(session.timeLeft) ? session.timeLeft : (config.time_limit || 10);
  els.timer.textContent = `残り時間: ${session.timeLeft}秒`;
  session.ticker = setInterval(()=>{
    session.timeLeft--;
    els.timer.textContent = `残り時間: ${session.timeLeft}秒`;
    if(session.timeLeft <= 0){
      clearTicker();
      autoCheckAnswer(quiz.groupSet);
    }
    storage.save();
  }, 1000);

  // 問題文
  const qEl = document.createElement("div");
  qEl.className = "question";
  qEl.textContent = quiz.question;
  els.container.appendChild(qEl);

  // 未配置（プール）領域
  const poolWrap = document.createElement("div");
  poolWrap.className = "pool-wrap";
  const poolTitle = document.createElement("h2"); poolTitle.textContent = "未配置";
  const pool = document.createElement("div"); pool.className = "pool";
  poolWrap.appendChild(poolTitle); poolWrap.appendChild(pool);

  // グループ領域
  const groupsWrap = document.createElement("div");
  groupsWrap.className = "groups-wrap";

  quiz.groupSet.forEach(g=>{
    const gDiv = document.createElement("div");
    gDiv.className = "group";
    gDiv.dataset.name = g.name;

    const h = document.createElement("h3"); h.textContent = g.name;
    const inner = document.createElement("div"); inner.className = "group-inner";

    gDiv.appendChild(h); gDiv.appendChild(inner);
    groupsWrap.appendChild(gDiv);

    // DnD
    gDiv.addEventListener("dragover", e=> e.preventDefault());
    gDiv.addEventListener("drop", e=>{
      e.preventDefault();
      const text = e.dataTransfer.getData("text/plain");
      const item = findItemByText(text);
      if(item && item.parentElement !== inner) inner.appendChild(item);
    });
  });

  // プールもD&D対応（戻す）
  pool.addEventListener("dragover", e=> e.preventDefault());
  pool.addEventListener("drop", e=>{
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain");
    const item = findItemByText(text);
    if(item && item.parentElement !== pool) pool.appendChild(item);
  });

  // アイテム生成
  const allItems = quiz.groupSet.flatMap(g=> g.items);
  const order = ensureItemOrder(qIdx, allItems);
  order.forEach(text=>{
    const it = createItem(text);
    pool.appendChild(it);
  });

  // DOM追加
  els.container.appendChild(poolWrap);
  els.container.appendChild(groupsWrap);

  // 答え合わせボタン
  const checkBtn = document.createElement("button");
  checkBtn.type = "button";
  checkBtn.textContent = "答え合わせ";
  checkBtn.addEventListener("click", ()=>{
    doCheck(quiz, checkBtn);
  });
  els.container.appendChild(checkBtn);

  // 保存（不測の終了でも復帰できるように）
  storage.save();

  // ユーティリティ
  function findItemByText(text){
    return $all(".item", els.container).find(el => el.textContent === text);
  }
}

function ensureItemOrder(qIdx, items){
  if(!Array.isArray(session.itemOrder[qIdx])){
    session.itemOrder[qIdx] = shuffle(items.slice());
    storage.save();
  }
  return session.itemOrder[qIdx];
}

function createItem(text){
  const div = document.createElement("div");
  div.className = "item";
  div.textContent = text;
  div.draggable = true;

  div.addEventListener("dragstart", e=>{
    e.dataTransfer.setData("text/plain", text);
  });

  // クリックで配置先を循環：プール→G1→G2→…→プール
  div.addEventListener("click", ()=>{
    const containers = [$(".pool", els.container), ...$all(".group .group-inner", els.container)];
    const curParent = div.parentElement;
    const idx = containers.indexOf(curParent);
    const next = containers[(idx + 1) % containers.length];
    if(next && next !== curParent) next.appendChild(div);
  });

  return div;
}

/* =========================
   採点・次へ
========================= */
function doCheck(quiz, checkBtn){
  if(session.answered) return;
  session.answered = true;
  clearTicker();

  const result = checkAnswer(quiz.groupSet);
  if(result.correct){
    els.message.innerHTML = "✅ 正解！";
    session.score++;
  }else{
    els.message.innerHTML = `❌ 不正解…（${result.total}中${result.correctCount}正解）<br><br><strong>模範解答：</strong><br>`;
    quiz.groupSet.forEach(g=>{
      els.message.innerHTML += `<strong>${g.name}</strong>：${g.items.join("、")}<br>`;
    });
  }

  // 正誤ハイライト
  applyHighlights(quiz.groupSet);

  // 次へ
  setHidden(els.nextBtn, false);
  checkBtn.disabled = true;

  // 次問のためのタイマー初期化値を保存
  session.timeLeft = config.time_limit || 10;
  storage.save();
}

function checkAnswer(groupSet){
  let correctCount = 0;
  let total = 0;
  groupSet.forEach(group=>{
    const box = $(`.group[data-name="${CSS.escape(group.name)}"] .group-inner`, els.container);
    const placed = $all(".item", box).map(el=> el.textContent);
    total += group.items.length;
    group.items.forEach(it=>{
      if(placed.includes(it)) correctCount++;
    });
  });
  return { correct: correctCount === total, correctCount, total };
}

function applyHighlights(groupSet){
  // いったん全てのアイテムの装飾を外す
  $all(".item", els.container).forEach(el=>{
    el.classList.remove("ok","ng");
    el.style.textDecoration = "";
    el.style.color = "";
  });

  // 正解グループに入っているアイテムはOK、誤配置はNG（下線）
  groupSet.forEach(group=>{
    const correctSet = new Set(group.items);
    const box = $(`.group[data-name="${CSS.escape(group.name)}"] .group-inner`, els.container);
    $all(".item", box).forEach(el=>{
      if(correctSet.has(el.textContent)){
        el.classList.add("ok");
        // 視覚的に分かりやすく（CSSがなければ軽く色付け）
        el.style.color = "var(--ok, #0a7)";
      }else{
        el.classList.add("ng");
        el.style.textDecoration = "underline";
        el.style.color = "var(--ng, #d33)";
      }
    });
  });
}

function autoCheckAnswer(groupSet){
  if(session.answered) return; // 多重実行防止
  session.answered = true;

  const result = checkAnswer(groupSet);
  els.message.innerHTML = `⏰ 時間切れ！<br>（${result.total}中${result.correctCount}正解）<br><br><strong>模範解答：</strong><br>`;
  groupSet.forEach(group=>{
    els.message.innerHTML += `<strong>${group.name}</strong>：${group.items.join("、")}<br>`;
  });

  applyHighlights(groupSet);
  setHidden(els.nextBtn, session.index + 1 >= session.order.length); // 最終問ならボタン非表示
  storage.save();
}

els.nextBtn.addEventListener("click", ()=>{
  session.index++;
  if(session.index < session.order.length){
    session.timeLeft = config.time_limit || 10;
    storage.save();
    renderCurrent();
  }else{
    showFinalResult();
  }
});

/* =========================
   終了
========================= */
function showFinalResult(){
  clearTicker();
  els.container.innerHTML = "<h2>終了！お疲れさまでした</h2>";
  els.message.innerHTML   = `あなたのスコアは <strong>${session.score} / ${quizzes.length}</strong> です`;
  els.timer.textContent   = "";
  setHidden(els.nextBtn, true);
  setHidden(els.pauseBtn, true);
  setHidden(els.backBtn, false);
  els.backBtn.addEventListener("click", ()=>{ window.location.href = "../index.html"; });
  storage.clear(); // 次回は最初から
}

/* =========================
   中断・復帰・離脱
========================= */
els.pauseBtn?.addEventListener("click", ()=>{
  storage.save();
  alert("進捗を保存しました。");
  window.location.href = "../index.html";
});

window.addEventListener("beforeunload", ()=>{
  storage.save();
});
