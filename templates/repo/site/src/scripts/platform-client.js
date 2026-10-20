// `:::::platform`（remark-platform.mjs）の Excel ／ スプレッドシート切り替え。
// 切り替えの操作はナビゲーションバーの選択欄と、進め方のページの大きなボタンだけ。本文のブロックはタブを出さない。
// 選んだ環境は <html data-platform="..."> に持ち、表示の出し分けは platform.css に任せる。
// <head> で読み込まれるので、属性だけは本文の描画前に付けてちらつきを防ぐ。
(function () {
  var KEY = 'handson-platform';
  var DIR = { excel: 'vba/', sheets: 'gas/' };

  function load() {
    try {
      return localStorage.getItem(KEY) === 'sheets' ? 'sheets' : 'excel';
    } catch (e) {
      return 'excel';
    }
  }

  // `::codeview` のパネルも、選んだ環境のファイルを開いた状態にそろえる（もう一方のファイルは platform.css で一覧から隠す）。
  // vba/SalesSummary.bas を開いていたら gas/SalesSummary.gs のように、同じ名前の相方を優先する。
  function syncEditors(platform) {
    document.querySelectorAll('.editor').forEach(function (editor) {
      var active = editor.querySelector('.editor__file.is-active');
      if (active && active.dataset.file.indexOf(DIR[platform]) === 0) return;
      var files = Array.prototype.slice.call(editor.querySelectorAll('.editor__file'));
      var inDir = files.filter(function (btn) {
        return btn.dataset.file.indexOf(DIR[platform]) === 0;
      });
      if (inDir.length === 0) return;
      var base = active ? baseName(active.dataset.file) : '';
      var pair = inDir.filter(function (btn) {
        return baseName(btn.dataset.file) === base;
      })[0];
      (pair || inDir[0]).click();
    });
  }

  function baseName(file) {
    return file.split('/').pop().replace(/\.[^.]+$/, '');
  }

  function apply(platform, save) {
    document.documentElement.dataset.platform = platform;
    if (save) {
      try {
        localStorage.setItem(KEY, platform);
      } catch (e) {
        // 保存できなくてもこのページ内の切り替えは効く。
      }
    }
    syncEditors(platform);
    syncControls(platform);
  }

  // ナビゲーションバーの選択欄と、進め方のページの大きなボタン（::platform-choice）の表示をそろえる。
  function syncControls(platform) {
    document.querySelectorAll('handson-platform-select select').forEach(function (select) {
      select.value = platform;
    });
    document.querySelectorAll('.platform-choice__option').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.dataset.platform === platform ? 'true' : 'false');
    });
  }

  document.documentElement.dataset.platform = load();

  function setup() {
    // 切り替えはナビゲーションバーの選択欄（src/components/ThemeSelect.astro）と、
    // 進め方のページの大きなボタン（::platform-choice）で行う。
    document.querySelectorAll('.platform-choice__option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        apply(btn.dataset.platform === 'sheets' ? 'sheets' : 'excel', true);
      });
    });
    document.querySelectorAll('handson-platform-select select').forEach(function (select) {
      select.value = load();
      select.addEventListener('change', function () {
        apply(select.value === 'sheets' ? 'sheets' : 'excel', true);
      });
    });
    apply(load(), false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
