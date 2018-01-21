import { init } from 'sapper/runtime.js';

// `routes` is an array of route objects injected by Sapper
init(document.querySelector('#sapper'), [{ pattern: /^\/?$/, params: match => ({}), load: () => import(/* webpackChunkName: "_" */ '/Volumes/OSX-Data/AltUsers/oli/dev/podcast/my-app/routes/index.html') }, { pattern: /^\/blog\/?$/, params: match => ({}), load: () => import(/* webpackChunkName: "blog" */ '/Volumes/OSX-Data/AltUsers/oli/dev/podcast/my-app/routes/blog/index.html') }, { pattern: /^\/blog(?:\/([^\/]+))?\/?$/, params: match => ({ slug: match[1] }), load: () => import(/* webpackChunkName: "blog_$slug$" */ '/Volumes/OSX-Data/AltUsers/oli/dev/podcast/my-app/routes/blog/[slug].html') }]);

import('/Volumes/OSX-Data/AltUsers/oli/dev/podcast/my-app/node_modules/webpack-hot-middleware/client.js?path=/__webpack_hmr&timeout=20000'); if (module.hot) module.hot.accept();