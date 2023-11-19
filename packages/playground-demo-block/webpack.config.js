const defaultConfig = require( "@wordpress/scripts/config/webpack.config" );

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
	}
};
