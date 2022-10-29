const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
	entry: {
		main: './src/main.ts',
		index: './src/index.ts',
		preload: './src/preload.ts'
	},
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
		clean: true
	},
	target: 'electron-main',
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: './src/*.html',
					to: './[name].html'
				},
				{
					from: './src/*.ico',
					to: './[name].ico'
				}
			]
		}),
		new MiniCssExtractPlugin()
	],
	module: {
		rules: [
			{
				test: /\.ts?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
			{
				test: /\.less$/i,
				use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader'],
			}
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	optimization: {
		minimize: false
	}
};