// script.js
(() => {
  'use strict';

  // ------- DOM -------
  const startBtn      = document.getElementById('start-button');
  const resetBtn      = document.getElementById('reset-button');
  const progressBtn   = document.getElementById('progress-button');
  const genreSelect   = document.getElementById('genre-select');
  const typeSelect    = document.getElementById('type-select');
  const levelSelect   = document.getElementById('level-select');
  const statusEl      = document.getElementById('status'); // aria-live

  if (!startBtn || !genreSelect || !typeSelect || !levelSelect) {
    console.error('[script.js] 必要な要素が見つかりません。index.htmlのIDを確認してください。');
    return;
  }

  const ROUTES = {
    MCQ:   'mcq_quiz/mcq_quiz.html',
    GROUP: 'group_quiz/group_quiz.html',
  };

  // ------- helpers -------
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };

  const buildUrl = (path, params) => {
    const url = new URL(path, window.location.href);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v)));
    return url.toString();
  };

  const persist = () => {
    // 最後に選んだ条件を保存（次回起動時に復元）
    localStorage.setItem('last_genre', genreSelect.value);
    localStorage.setItem('last_type', typeSelect.value);
    localStorage.setItem('last_level', levelSelect.value);
  };

  const restore = () => {
    const lastGenre = localStorage.getItem('last_genre');
    const lastType  = localStorage.getItem('last_type');
    const lastLevel = localStorage.getItem('last_level');

    if (lastGenre && [...genreSelect.options].some(o => o.value === lastGenre)) {
      genreSelect.value = lastGenre;
    }
    if (lastType && [...typeSelect.options].some(o => o.value === lastType)) {
      typeSelect.value = lastType;
    }
    if (lastLevel && [...levelSelect.options].some(o => o.value === lastLevel)) {
      levelSelect.value = lastLevel;
    }
  };

  const startQuiz = () => {
    const genre = genreSelect.value;
    const type  = typeSelect.value;
    const level = levelSelect.value;

    const route = ROUTES[type] || ROUTES.MCQ; // 念のためMCQをデフォルト
    const href  = buildUrl(route, { genre, level });

    persist();
    setStatus(`開始：ジャンル=${genre} / 形式=${type} / 難易度=${level}`);
    window.location.href = href;
  };

  const resetProgress = () => {
    const ok = window.confirm('全ての進捗（progress_*）を削除しますか？');
    if (!ok) return;

    // progress_ で始まるキーを全削除（後方から消す）
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('progress_')) {
        localStorage.removeItem(key);
      }
    }
    setStatus('進捗を削除しました。');
    // 必要なら alert も
    // alert('進捗を削除しました。');
  };

  const gotoProgress = () => {
    window.location.href = 'progress.html';
  };

  // ------- events -------
  startBtn.addEventListener('click', startQuiz);
  progressBtn && progressBtn.addEventListener('click', gotoProgress);
  resetBtn && resetBtn.addEventListener('click', resetProgress);

  // Enter でスタート（セレクトにフォーカス中など）
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'Enter') {
      const el = document.activeElement;
      if (!el) return;
      const tag = el.tagName.toLowerCase();
      if (tag === 'select' || el.id === 'start-button') startQuiz();
    }
  });

  // 選択変更は即保存
  [genreSelect, typeSelect, levelSelect].forEach(sel => {
    sel.addEventListener('change', persist);
  });

  // 初期化
  restore();
  setStatus('準備完了。条件を選んで「スタート」を押してください。');
})();
