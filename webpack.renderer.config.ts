import type { Configuration } from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

export const rendererConfig: Configuration = {
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name]/index.css'
		})
	],
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader']
			},
			{
				test: /\.less$/i,
				use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
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
