import type { Configuration } from 'webpack';

export const mainConfig: Configuration = {
	entry: './src/main/main.ts',
	module: {
		rules: [
			{
				// We're specifying native_modules in the test because the asset relocator loader generates a
				// "fake" .node file which is really a cjs file.
				test: /native_modules\/.+\.node$/,
				use: 'node-loader'
			},
			{
				test: /\.(m?js|node)$/,
				parser: { amd: false },
				use: {
					loader: '@vercel/webpack-asset-relocator-loader',
					options: { outputAssetBase: 'native_modules' }
				}
			},
			{
				test: /\.ts$/,
				exclude: /(node_modules|\.webpack)/,
				use: 'ts-loader'
			},
			{
				test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
				type: 'asset/resource',
			}
		]
	},
	resolve: {
		extensions: ['.ts', '.js'],
	}
};