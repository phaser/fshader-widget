const path = require('path');

module.exports = {
  entry: './src/index.js',
  experiments: {
    outputModule: true,
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'module',
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        type: 'asset/source',
      },
    ],
  },
};
