const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || "development",
  entry: {
    popup: './src/popup.ts',
    admin: './src/admin.ts',
    utils: './src/utils.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { 
            from: ".", 
            to: ".",
            context: "./public",
            globOptions: {
              ignore: ["**/manifest.sample.json"], // 除外したいファイルを指定
            }
          }
      ],
    }),
  ],
};