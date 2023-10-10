import type { Configuration } from 'webpack';
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const commonConfig = {
	output: {
		path: path.resolve(__dirname, 'build'),
		filename: '[name].js'
	},
	module: {
		rules: [
			{
				test: /\.ts?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.ico$/i,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: '[name].[ext]'
						}
					}
				]
			}
		]
	},
	resolve: {
		extensions: ['.ts', '.js'],
	}
};

const mainConfig: Configuration = {
	...commonConfig,
	target: 'electron-main',
	entry: {
		main: './src/main/main.ts'
	}
};

const rendererConfig: Configuration = {
	...commonConfig,
	target: 'electron-renderer',
	entry: {
		window: './src/window/window.ts'
	},
	plugins: [
		new HtmlWebpackPlugin({
			filename: 'window.html',
			template: './src/window/window.html'
		}),
		new MiniCssExtractPlugin({
			filename: 'window.css'
		})
	],
	module: {
		rules: [
			...commonConfig.module.rules,
			{
				test: /\.html$/,
				use: 'html-loader'
			},
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
			{
				test: /\.less$/i,
				use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader'],
			}
		]
	}
};

const preloadConfig: Configuration = {
	...commonConfig,
	target: 'electron-preload',
	entry: {
		preload: './src/preload/preload.ts'
	}
};

export default [mainConfig, rendererConfig, preloadConfig];