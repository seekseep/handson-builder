// __LECTURE_TITLE__ の動くコード。
//
// このファイルと index.html だけで動く（ビルド・パッケージ管理なし）。
// 前の節の example/ をコピーして、この節の差分だけを足すのが基本の進め方。
//
// 抽象化しすぎない。関数へ切り出さず、上から手続き的に書く。
// 即値の定数は使う直前に置く（モジュール先頭へ巻き上げない）。

const message = document.createElement('p');
message.textContent = 'ここに、この節で作るものを書く';
message.style.color = '#fdf6e3';
document.body.append(message);
