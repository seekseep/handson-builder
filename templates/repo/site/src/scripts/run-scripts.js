// `:::script`（remark-script.mjs）が埋め込む実行用コードを、このページ上で走らせる。
// `<script type="text/plain" class="run-on-load">` の中身を new Function で実行する。
// 対象が無いページでは何もしない。全ページの <head> に inline 注入される。
(function () {
  function run() {
    document.querySelectorAll('script.run-on-load[type="text/plain"]').forEach(function (el) {
      try {
        new Function(el.textContent)();
      } catch (e) {
        console.error('[run-scripts] 実行に失敗しました:', e);
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
