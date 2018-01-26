const config = require('sapper/webpack/config.js')

module.exports = {
  entry: config.server.entry(),
  output: config.server.output(),
  target: 'node',
  resolve: {
    extensions: ['.js', '.html']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.html$/,
        exclude: /node_modules/,
        use: {
          loader: 'svelte-loader',
          options: {
            css: false,
            cascade: false,
            store: true,
            generate: 'ssr'
          }
        }
      }
    ]
  }
}
