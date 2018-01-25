const webpack = require('webpack');
const config = require('sapper/webpack/config.js');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const isDev = config.dev;

const clientEntries = config.client.entry();
clientEntries.main.splice(0, 0, 'babel-register', 'babel-polyfill'),

module.exports = {
	entry: clientEntries,
	output: config.client.output(),
	resolve: {
		extensions: ['.js', '.html']
	},
	module: {
		rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
			{
				test: /\.html$/,
				exclude: /node_modules/,
				use: {
					loader: 'svelte-loader',
					options: {
						hydratable: true,
						emitCss: !isDev,
						cascade: false,
						store: true
					}
				}
			},
			isDev && {
				test: /\.css$/,
				use: [
					{ loader: 'style-loader' },
					{ loader: 'css-loader' }
				]
			},
			!isDev && {
				test: /\.css$/,
				use: ExtractTextPlugin.extract({
					fallback: 'style-loader',
					use: [{ loader: 'css-loader', options: { sourceMap:isDev } }]
				})
			}
		].filter(Boolean)
	},
	plugins: [
		new webpack.optimize.CommonsChunkPlugin({
			minChunks: 2,
			async: false,
			children: true
		})
	].concat(isDev ? [
		new webpack.HotModuleReplacementPlugin()
	] : [
		new ExtractTextPlugin('main.css'),
		new webpack.optimize.ModuleConcatenationPlugin(),
		new UglifyJSPlugin()
	]).filter(Boolean),
	devtool: isDev && 'inline-source-map'
};
