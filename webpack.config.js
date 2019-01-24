var path = require('path')
var config = {
  entry: ['./react/App.tsx'],
  target: 'electron-renderer',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: [/node_modules/, /_types/],
        loader: 'awesome-typescript-loader',
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        exclude: [/node_modules/, /_types/],
        loader: 'source-map-loader',
      },
    ],
  },
  // externals: {
  //   react: 'React',
  //   'react-dom': 'ReactDOM',
  // },
}

module.exports = config
