var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = require('./webpack.config');

module.exports.debug = true;
module.exports.devtool = 'source-map';
module.exports.entry = ['./nengo_gui/static/nengo-debug.ts'];
module.exports.output.pathinfo = true;
module.exports.output.publicPath = "/";
module.exports.plugins.push(new HtmlWebpackPlugin({title: "Nengo Debug"}));
module.exports.ts = {
    ignoreDiagnostics: [
        "2304", "2339", "1192", "1134", "2364", "2322",
        "2346", "2345", "1109", "1005", "2341",
    ]
}
