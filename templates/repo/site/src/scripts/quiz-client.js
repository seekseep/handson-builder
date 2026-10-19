/**
 * `:::questions` ディレクティブ（remark-questions.mjs）が出力した
 * `<div class="quiz" data-questions="...">` を、対話式の◯✕クイズに仕立てる。
 *
 * 画面遷移: スタート → 問1 → … → 問N → 結果
 * - 各問は◯✕の2ボタンで1問1答。前へ／次へで行き来できる。
 * - 最後の問で「回答を完了する」を押すと結果画面へ。
 * - 結果画面は「N問中M問正解」と、全問の正解を列挙（正解=緑 / 不正解=赤）。
 * - 記録（点数）は localStorage に保存し、次回のスタート／結果画面で「前回」を表示。
 * - 「もう一度挑戦する」でスタートに戻る。
 *
 * astro.config.mjs の Starlight `head` から全ページに inline 注入される。
 * クイズが無いページでは何もしない。
 */
(function () {
  // 丸・バツは絵文字だとフォント依存で大きさ・太さが揃わないため、
  // 同じ viewBox・同じ枠サイズの自前 SVG で描く。色は currentColor で継承。
  var SVG = {
    o:
      '<svg class="quiz-mark" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="11"/>' +
      '</svg>',
    x:
      '<svg class="quiz-mark" viewBox="0 0 100 100" aria-hidden="true">' +
      '<line x1="30" y1="30" x2="70" y2="70" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>' +
      '<line x1="70" y1="30" x2="30" y2="70" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>' +
      '</svg>',
  };
  var LABEL = { o: 'まる', x: 'ばつ' };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function init(root, index) {
    var questions;
    try {
      questions = JSON.parse(root.getAttribute('data-questions') || '[]');
    } catch (e) {
      return;
    }
    if (!Array.isArray(questions) || questions.length === 0) return;
    // 二重初期化を防ぐ
    if (root.getAttribute('data-quiz-ready') === '1') return;
    root.setAttribute('data-quiz-ready', '1');

    var total = questions.length;
    var storageKey = 'quiz:' + location.pathname + ':' + index;
    var answers = new Array(total).fill(null); // 'o' | 'x' | null
    var screen = 'start'; // 'start' | 0..total-1 | 'result'

    function loadRecord() {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || 'null');
      } catch (e) {
        return null;
      }
    }
    function saveRecord(rec) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(rec));
      } catch (e) {
        /* localStorage が使えない環境では黙って諦める */
      }
    }
    function score() {
      var s = 0;
      for (var i = 0; i < total; i++) {
        if (answers[i] === questions[i].answer) s++;
      }
      return s;
    }
    function reset() {
      answers = new Array(total).fill(null);
      screen = 'start';
      render();
    }

    function recordLine(rec) {
      if (!rec) return '';
      return (
        '<p class="quiz-record">前回の記録: <strong>' +
        rec.score +
        ' / ' +
        rec.total +
        '</strong> 問正解</p>'
      );
    }

    function renderStart() {
      var rec = loadRecord();
      root.innerHTML =
        '<div class="quiz-screen quiz-start">' +
        '<p class="quiz-kicker">確認クイズ</p>' +
        '<p class="quiz-lead">全 ' + total + ' 問。⭕❌で答えてください。</p>' +
        recordLine(rec) +
        '<div class="quiz-actions">' +
        '<button type="button" class="quiz-btn quiz-btn-primary" data-act="start">スタート</button>' +
        '</div>' +
        '</div>';
    }

    function renderQuestion(i) {
      var q = questions[i];
      var picked = answers[i];
      var isLast = i === total - 1;
      root.innerHTML =
        '<div class="quiz-screen quiz-question">' +
        '<p class="quiz-progress">問 ' + (i + 1) + ' / ' + total + '</p>' +
        '<p class="quiz-text">' + esc(q.text) + '</p>' +
        '<div class="quiz-choices">' +
        '<button type="button" class="quiz-choice' + (picked === 'o' ? ' is-selected' : '') + '" data-act="pick" data-val="o" aria-pressed="' + (picked === 'o') + '" aria-label="' + LABEL.o + '">' + SVG.o + '</button>' +
        '<button type="button" class="quiz-choice' + (picked === 'x' ? ' is-selected' : '') + '" data-act="pick" data-val="x" aria-pressed="' + (picked === 'x') + '" aria-label="' + LABEL.x + '">' + SVG.x + '</button>' +
        '</div>' +
        '<div class="quiz-nav">' +
        '<button type="button" class="quiz-btn" data-act="prev">前へ</button>' +
        (isLast
          ? '<button type="button" class="quiz-btn quiz-btn-primary" data-act="finish">回答を完了する</button>'
          : '<button type="button" class="quiz-btn quiz-btn-primary" data-act="next">次へ</button>') +
        '</div>' +
        '</div>';
    }

    function renderResult() {
      var s = score();
      var rows = '';
      for (var i = 0; i < total; i++) {
        var correct = answers[i] === questions[i].answer;
        rows +=
          '<li class="quiz-result-row ' + (correct ? 'is-correct' : 'is-wrong') + '">' +
          '<span class="quiz-result-text">' + esc(questions[i].text) + '</span>' +
          '<span class="quiz-result-mark" aria-label="正解: ' + LABEL[questions[i].answer] + '">' + SVG[questions[i].answer] + '</span>' +
          '</li>';
      }
      var prev = loadRecord();
      saveRecord({ score: s, total: total });

      root.innerHTML =
        '<div class="quiz-screen quiz-result">' +
        '<p class="quiz-kicker">結果</p>' +
        '<p class="quiz-score"><strong>' + s + '</strong> / ' + total + ' 問正解</p>' +
        recordLine(prev) +
        '<ul class="quiz-result-list">' + rows + '</ul>' +
        '<div class="quiz-actions">' +
        '<button type="button" class="quiz-btn quiz-btn-primary" data-act="retry">もう一度挑戦する</button>' +
        '</div>' +
        '</div>';
    }

    function render() {
      if (screen === 'start') renderStart();
      else if (screen === 'result') renderResult();
      else renderQuestion(screen);
    }

    root.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-act]');
      if (!btn || !root.contains(btn)) return;
      var act = btn.getAttribute('data-act');

      if (act === 'start') {
        screen = 0;
        render();
      } else if (act === 'pick') {
        if (typeof screen === 'number') {
          answers[screen] = btn.getAttribute('data-val');
          renderQuestion(screen); // 選択状態を反映
        }
      } else if (act === 'prev') {
        if (screen === 0) screen = 'start';
        else if (typeof screen === 'number') screen = screen - 1;
        render();
      } else if (act === 'next') {
        if (typeof screen === 'number' && screen < total - 1) {
          screen = screen + 1;
          render();
        }
      } else if (act === 'finish') {
        screen = 'result';
        render();
      } else if (act === 'retry') {
        reset();
      }
    });

    render();
  }

  function boot() {
    var nodes = document.querySelectorAll('.quiz[data-questions]');
    for (var i = 0; i < nodes.length; i++) init(nodes[i], i);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
