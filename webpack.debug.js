var HtmlWebpackPlugin = require("html-webpack-plugin");
var webpack = require("webpack");

var webpackConfig = require("./webpack.config");

module.exports = env => {
    var config = webpackConfig(env);
    config.devtool = "source-map";
    config.entry = { debug: "./nengo_gui/static/debug/main.ts" };
    config.output.pathinfo = true;
    config.output.publicPath = "/";
    config.plugins.push(
        new HtmlWebpackPlugin({
            title: "Nengo Debug"
        })
    );
    config.module.rules.forEach(rule => {
        if (rule.test.toString() === /\.tsx?$/.toString()) {
            rule.use = {
                loader: "ts-loader",
                options: {
                    ignoreDiagnostics: [
                        "2304",
                        "2339",
                        "1192",
                        "1134",
                        "2364",
                        "2322",
                        "2346",
                        "2345",
                        "1109",
                        "1005",
                        "2341"
                    ]
                }
            };
        }
    });

    return config;
};
