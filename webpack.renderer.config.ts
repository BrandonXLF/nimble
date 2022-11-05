import type { Configuration } from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { mainConfig } from './webpack.main.config';

export const rendererConfig: Configuration = {
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name]/index.css'
		})
	],
	module: {
		rules: [
			...(mainConfig.module?.rules || []),
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader']
			},
			{
				test: /\.less$/i,
				use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
			}
		]
	},
	resolve: {
		extensions: ['.ts', '.js'],
	}
};
