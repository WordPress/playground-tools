const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
	...defaultConfig,
	module: {
		rules: [
			...defaultConfig.module.rules,
			{
				test: /\.m?js$/,
				resolve: {
					fullySpecified: false,
				},
			},
		],
	},
	context: __dirname,
	plugins: [
		...defaultConfig.plugins,
		new CopyWebpackPlugin({
			patterns: [
				{ from: '*.php', to: '../' },
				{
					from: '../../node_modules/esbuild-wasm/esbuild.wasm',
					to: './',
				},
			],
		}),
	],
};
