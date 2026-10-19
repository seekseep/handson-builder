# __LECTURE_TITLE__

__SITE_TITLE__ の 1 レクチャー。ビルド・パッケージ管理なしで、ブラウザだけで動きます。

## 構成

```text
__LECTURE_SLUG__/
├── LECTURE.md        教材本文（docs: true → サイトに載る）
├── README.md         このファイル
├── images/           説明図の SVG（00-thumbnail.svg を先頭サムネに）
├── example/          動くコード ← 配布 ZIP とライブプレビューの元
│   ├── index.html
│   ├── main.js
│   └── assets/       画像・音（配る素材がある節だけ作る）
└── demos/            解説用の小さなデモ（任意・複数可。ZIP には入らない）
    └── <name>/index.html
```

## 動かす

`example/index.html` をブラウザで開くだけです。ただし `assets/` を読み込む節は
`file://` だと失敗するので、簡易サーバー経由で開いてください。

```sh
python3 -m http.server 8000
# http://localhost:8000/sections/__SECTION_SLUG__/__LECTURE_SLUG__/example/
```

ライブラリは CDN（cdnjs）から読み込むので、インストールは不要です。
