// `::preview` のライブプレビュー（sentinels.mjs が生成する `.lecture-preview`）の
// 「↻ 再読み込み」ボタン。押すと iframe を読み直し、ゲームを最初からやり直せる。
// `.lecture-preview` が無いページでは何もしない。全ページの <head> に inline 注入される。
(function () {
  function reload(iframe) {
    // src を入れ直すことで確実に読み直す（location.reload はタイミングで空振りするため）。
    var src = iframe.getAttribute('src');
    iframe.setAttribute('src', src);
  }

  function setup() {
    document.querySelectorAll('.lecture-preview').forEach(function (fig) {
      var btn = fig.querySelector('.lecture-preview__reload');
      var iframe = fig.querySelector('.lecture-preview__frame');
      if (!btn || !iframe) return;
      btn.addEventListener('click', function () {
        reload(iframe);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
