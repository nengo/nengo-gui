var path = require("path");
var TypedocPlugin = require("typedoc-webpack-plugin");
var webpack = require("webpack");

var config = {
    context: __dirname, // Paths are relative to nengo_gui
    // Putting the entry point in a list is a workaround for this error:
    // Error: a dependency to an entry point is not allowed
    entry: {
        nengo: "./nengo_gui/static/nengo.ts",
    },
    output: {
        path: path.resolve(__dirname, "./nengo_gui/static/dist"),
        filename: "[name].js",
        publicPath: "/static/dist/" // Fixes issue finding emitted files
    },
    resolve: {
        extensions: [".js", ".json", ".ts"]
    },
    module: { rules: [
        {
            test: /\.css$/,
            use: [
                "style-loader",
                "css-loader",
                {
                    loader: "postcss-loader",
                    options: {
                        plugins: function() {
                            return [
                                // Must be first
                                require("postcss-import")({
                                    path: ["./nengo_gui/static"],
                                }),
                                // Must be before postcss-nested
                                require("postcss-nested-props"),
                                require("postcss-nested"),
                                require("postcss-color-function"),
                                require("postcss-color-gray"),
                                require("postcss-atroot"),
                                require("postcss-custom-properties"),
                                require("autoprefixer"),
                            ];
                        },
                    },
                },
            ],
        },
        {
            test: /\.ico$/,
            use: { loader: "file-loader", options: { name: "[name].[ext]" } },
        },
        {
            test: /\.(png|jpg|gif)$/,
            use: { loader: "url-loader", options: { limit: 8192 } },
        },
        {
            test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
            use: {
                loader: "url-loader",
                options: {
                    limit: 8192,
                    mimetype: "application/font-woff",
                    name: "./[hash].[ext]",
                },
            }
        },
        {
            test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
            use: { loader: "file-loader", options: { name: "./[hash].[ext]" } },
        },
        { test: /\.tsx?$/, use: "ts-loader" },
    ]},
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
        }),
    ],
}

module.exports = (env) => {
    if (!env.noDocs) {
        config.plugins.push(new TypedocPlugin({}));
    }
    return config;
}
