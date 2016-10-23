var path = require('path');
var glob = require('glob');
var TapWebpackPlugin = require('tap-webpack-plugin');

module.exports = require('./webpack.config');

module.exports.debug = true;
module.exports.entry = glob.sync('./nengo_gui/**/tests/*.test.ts');
module.exports.externals = 'jsdom';
module.exports.output = {
    filename: 'nengo.test.js',
    libraryTarget: "commonjs",
    path: './nengo_gui/static/dist/',
    pathinfo: true,
}
module.exports.target = 'node';
module.exports.node = {
    __dirname: true,
    __filename: true,
}
module.exports.plugins.push(new TapWebpackPlugin({reporter: 'faucet'}));
module.exports.ts = {
    ignoreDiagnostics: [
        "2304", "2339", "1192", "1134", "2364", "2322",
        "2346", "2345", "1109", "1005", "2341",
    ]
}

// "test": "ts-node node_modules/tape/bin/tape 'nengo_gui/**/tests/*.test.ts' | faucet",
