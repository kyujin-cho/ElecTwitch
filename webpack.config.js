module.exports = {
    entry : ['babel-polyfill', './react/script.js'],
    output: {
        path: __dirname + '/js',
        filename: 'index.js',
        sourceMapFilename: 'index.js.map',
        publicPath: __dirname + '/js'
    },
    module: {
        loaders: [
            {
            test: /\.js?$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            query: {
                cacheDirectory: true,
                presets: ['react', 'env']
            }
            }
        ]
    }
}