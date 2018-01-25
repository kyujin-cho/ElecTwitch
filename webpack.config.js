
module.exports = [{
    entry : ['babel-polyfill', './react/script.js'],
    output: {
        path: __dirname + '/javascripts',
        filename: 'index.js',
        sourceMapFilename: 'index.js.map',
        publicPath: __dirname + '/javascripts'
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
}, {
    entry : ['babel-polyfill', './react/chat.js'],
    output: {
        path: __dirname + '/javascripts',
        filename: 'chat.js',
        sourceMapFilename: 'chat.js.map',
        publicPath: __dirname + '/javascripts'
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
}]