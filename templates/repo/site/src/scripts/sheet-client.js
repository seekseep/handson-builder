// `::::sheetdemo` / `::sheetcode`（libs/sheets.mjs）のシート表示の動き。
//   - セルを押すと、名前ボックスと数式バーにそのセルの番地と中身を出す
//   - `::::sheetdemo` の「▶ 実行」で data-after の値に切り替え、「↺ リセット」で戻す
//   - msgbox を書いたデモは、実行でメッセージの小窓を出し、「OK」で閉じる
//   - macro を付けたデモは、Excel は「マクロ」の一覧から選んで「実行」、スプレッドシートは
//     関数の選択欄で選んで「▶ 実行」したときだけ結果を出す（実際の操作の順番をなぞる）
// コードは動かさない。何が起きるかのイメージを見せるだけ。
// 本文より先に <head> で読まれるので、クリックは document で受ける。
(function () {
  function showCell(cell) {
    var sheet = cell.closest('.sheet');
    sheet.querySelectorAll('.sheet__cell.is-selected').forEach(function (c) {
      c.classList.remove('is-selected');
    });
    cell.classList.add('is-selected');
    sheet.querySelector('.sheet__namebox').textContent = cell.dataset.ref;
    sheet.querySelector('.sheet__formula').textContent =
      cell.dataset.raw !== undefined ? cell.dataset.raw : cell.textContent;
  }

  function run(demo) {
    demo.querySelectorAll('.sheet__cell[data-after]').forEach(function (cell) {
      cell.dataset.before = cell.textContent;
      cell.dataset.beforeRaw = cell.dataset.raw !== undefined ? cell.dataset.raw : '';
      cell.dataset.beforeNumber = cell.classList.contains('is-number') ? '1' : '';
      cell.textContent = cell.dataset.after;
      if (cell.dataset.afterRaw !== cell.dataset.after) cell.dataset.raw = cell.dataset.afterRaw;
      else delete cell.dataset.raw;
      if (cell.hasAttribute('data-after-number')) cell.classList.add('is-number');
      // リセットで元に戻すセルの印（見た目は変えない）。
      cell.classList.add('is-changed');
    });
    // ログの欄と、実行で増えるシート（最初に足したものを選んだ状態にする）。
    var log = demo.querySelector('.sheetdemo__log');
    if (log) log.hidden = false;
    var added = demo.querySelectorAll('.sheet__tab--added');
    var openAdded = demo.hasAttribute('data-open-added');
    var current = demo.querySelector('.sheet__tab.is-active');
    if (current) demo.dataset.startSheet = current.dataset.sheet;
    added.forEach(function (t) {
      t.hidden = false;
    });
    if (added.length && openAdded) showSheet(demo.querySelector('.sheet'), added[0].dataset.sheet);
    var dialog = demo.querySelector('.sheetdemo__dialog');
    if (dialog) {
      dialog.hidden = false;
      // 小窓は Excel 用とスプレッドシート用の 2 つがあり、CSS で片方を隠している。
      // 見えているほうの OK にフォーカスを当てる（隠れた要素にはフォーカスが当たらない）。
      var platform = document.documentElement.dataset.platform === 'sheets' ? 'sheets' : 'excel';
      var ok = dialog.querySelector('.sheetdemo__dialog-box--' + platform + ' .sheetdemo__dialog-ok');
      if (ok) ok.focus({ preventScroll: true });
    }
    setRunDisabled(demo, true);
    demo.querySelector('.sheetdemo__reset').disabled = false;
    refresh(demo);
  }

  // 実行ボタンは、単純な「▶ 実行」か、マクロ選択の流れ（マクロ／関数の実行）のどちらか。
  function setRunDisabled(demo, disabled) {
    demo.querySelectorAll('.sheetdemo__run, .sheetdemo__macro-open, .sheetdemo__gas-run').forEach(function (b) {
      b.disabled = disabled;
    });
  }

  // 開いた時点では何も選ばない。「実行」はいつでも押せて、選ばずに押したら赤字で知らせる。
  function openMacros(demo) {
    var picker = demo.querySelector('.sheetdemo__macros');
    picker.querySelectorAll('.sheetdemo__macro-item').forEach(function (b) {
      b.classList.remove('is-selected');
    });
    picker.querySelector('.sheetdemo__macros-error').hidden = true;
    picker.hidden = false;
  }

  // 選んだマクロが、このデモで再現しているマクロなら結果を出す。
  function runMacro(demo, name) {
    var expected = demo.querySelector('.sheetdemo__bar').dataset.macro;
    if (name === expected) run(demo);
  }

  function reset(demo) {
    var dialog = demo.querySelector('.sheetdemo__dialog');
    if (dialog) dialog.hidden = true;
    var log = demo.querySelector('.sheetdemo__log');
    if (log) log.hidden = true;
    if (demo.dataset.startSheet) showSheet(demo.querySelector('.sheet'), demo.dataset.startSheet);
    demo.querySelectorAll('.sheet__tab--added').forEach(function (t) {
      t.hidden = true;
    });
    demo.querySelectorAll('.sheet__cell.is-changed').forEach(function (cell) {
      cell.textContent = cell.dataset.before;
      if (cell.dataset.beforeRaw) cell.dataset.raw = cell.dataset.beforeRaw;
      else delete cell.dataset.raw;
      if (!cell.dataset.beforeNumber) cell.classList.remove('is-number');
      cell.classList.remove('is-changed');
    });
    var picker = demo.querySelector('.sheetdemo__macros');
    if (picker) picker.hidden = true;
    setRunDisabled(demo, false);
    demo.querySelector('.sheetdemo__reset').disabled = true;
    refresh(demo);
  }

  // 選んでいるセルがあれば、数式バーを今の中身に合わせる。
  function refresh(demo) {
    var selected = demo.querySelector('.sheet__cell.is-selected');
    if (selected) showCell(selected);
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    // ページ内のクリックをすべて受けるので、シートの外ならすぐ抜ける。
    if (!target.closest('.sheet, .sheetdemo')) return;
    var cell = target.closest('.sheet__cell');
    if (cell) {
      showCell(cell);
      return;
    }
    var demo = target.closest('.sheetdemo');
    if (target.closest('.sheetdemo__macro-open')) {
      openMacros(demo);
      return;
    }
    var item = target.closest('.sheetdemo__macro-item');
    if (item) {
      item.closest('.sheetdemo__macros-list').querySelectorAll('.sheetdemo__macro-item').forEach(function (b) {
        b.classList.toggle('is-selected', b === item);
      });
      demo.querySelector('.sheetdemo__macros-error').hidden = true;
      return;
    }
    if (target.closest('.sheetdemo__macros-cancel')) {
      demo.querySelector('.sheetdemo__macros').hidden = true;
      return;
    }
    if (target.closest('.sheetdemo__macros-run')) {
      var selected = demo.querySelector('.sheetdemo__macro-item.is-selected');
      if (!selected) {
        demo.querySelector('.sheetdemo__macros-error').hidden = false;
        return;
      }
      demo.querySelector('.sheetdemo__macros').hidden = true;
      runMacro(demo, selected.dataset.name);
      return;
    }
    if (target.closest('.sheetdemo__gas-run')) {
      runMacro(demo, demo.querySelector('.sheetdemo__gas-select').value);
      return;
    }
    var ok = target.closest('.sheetdemo__dialog-ok');
    if (ok) {
      ok.closest('.sheetdemo__dialog').hidden = true;
      return;
    }
    if (target.closest('.sheetdemo__run')) run(demo);
    else if (target.closest('.sheetdemo__reset')) reset(demo);
  });
  // Excel と同じく、一覧のマクロ名をダブルクリックしても実行できる。
  document.addEventListener('dblclick', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var item = target.closest('.sheetdemo__macro-item');
    if (!item) return;
    var demo = item.closest('.sheetdemo');
    demo.querySelector('.sheetdemo__macros').hidden = true;
    runMacro(demo, item.dataset.name);
  });
  // シートの見出しを押したら、そのシートを出す（ブックの全シートは描いてあり、選んだもの以外は hidden）。
  function showSheet(sheet, name) {
    if (!sheet) return;
    sheet.querySelectorAll('.sheet__grid[data-sheet]').forEach(function (g) {
      g.hidden = g.dataset.sheet !== name;
    });
    sheet.querySelectorAll('.sheet__tab[data-sheet]').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.sheet === name);
    });
    sheet.querySelectorAll('.sheet__cell.is-selected').forEach(function (c) {
      c.classList.remove('is-selected');
    });
    sheet.querySelector('.sheet__namebox').textContent = '';
    sheet.querySelector('.sheet__formula').textContent = '';
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var tab = target.closest('.sheet__tab[data-sheet]');
    if (tab) {
      showSheet(tab.closest('.sheet'), tab.dataset.sheet);
      return;
    }
    var full = target.closest('.sheetdemo__fullscreen');
    if (full) toggleFullscreen(full.closest('.sheetdemo'), full);
  });

  // 下端の帯をドラッグして、シートの表示を縦に広げる（全シート共通の高さにする）。
  document.addEventListener('pointerdown', function (e) {
    var target = e.target;
    if (!(target instanceof Element) || !target.classList.contains('sheet__resizer')) return;
    var sheet = target.closest('.sheet');
    var visible = sheet.querySelector('.sheet__grid:not([hidden])');
    if (!visible) return;
    e.preventDefault();
    var startY = e.clientY;
    var startH = visible.getBoundingClientRect().height;
    target.setPointerCapture(e.pointerId);
    function move(ev) {
      var h = Math.max(120, startH + ev.clientY - startY);
      sheet.style.setProperty('--sheet-grid-height', h + 'px');
      sheet.classList.add('is-resized');
    }
    function up() {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
    }
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  });

  // 全画面。Fullscreen API が使えないブラウザ（iPhone の Safari など）は、画面に固定する表示で代わりにする。
  function toggleFullscreen(demo, button) {
    var on = !(document.fullscreenElement === demo || demo.classList.contains('is-fullscreen'));
    if (on && demo.requestFullscreen) {
      demo.requestFullscreen().catch(function () {
        demo.classList.add('is-fullscreen');
      });
    } else if (!on && document.fullscreenElement === demo) {
      document.exitFullscreen();
    } else {
      demo.classList.toggle('is-fullscreen', on);
    }
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.textContent = on ? '✕ 全画面を終了' : '⛶ 全画面';
  }

  document.addEventListener('fullscreenchange', function () {
    document.querySelectorAll('.sheetdemo__fullscreen[aria-pressed="true"]').forEach(function (b) {
      var demo = b.closest('.sheetdemo');
      if (document.fullscreenElement !== demo && !demo.classList.contains('is-fullscreen')) {
        b.setAttribute('aria-pressed', 'false');
        b.textContent = '⛶ 全画面';
      }
    });
  });
})();
