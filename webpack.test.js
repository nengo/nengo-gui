var glob = require("glob");
var path = require("path");
var TapWebpackPlugin = require("tap-webpack-plugin");
var webpackConfig = require("./webpack.config");

module.exports = (env) => {
    var config = webpackConfig(env);

    // Style loader doesn't work in testing
    config.module.rules[0].use.splice(0, 1);
    config.entry = glob.sync("./nengo_gui/**/tests/*.test.ts");
    config.externals = "jsdom";
    config.output = {
        filename: "nengo.test.js",
        libraryTarget: "commonjs",
        path: path.resolve(__dirname, "./nengo_gui/static/dist/"),
        pathinfo: true,
    }
    config.target = "node";
    config.node = {
        __dirname: true,
        __filename: true,
    }
    config.plugins.push(new TapWebpackPlugin({reporter: "faucet"}));
    config.module.rules.forEach(rule => {
        if (rule.test.toString() === /\.tsx?$/.toString()) {
            rule.use = {
                loader: "ts-loader",
                options: {
                    ignoreDiagnostics: [
                        "2304", "2339", "1192", "1134", "2364", "2322",
                        "2346", "2345", "1109", "1005", "2341",
                    ]
                },
            };
        }
    });

    return config
}
