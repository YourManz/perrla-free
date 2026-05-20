const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const isProd = process.env.NODE_ENV === "production";
const outputPath = isProd
  ? path.resolve(__dirname, "../web/static/word-addin")
  : path.resolve(__dirname, "dist");

module.exports = {
  entry: "./src/taskpane.ts",
  output: {
    filename: "taskpane.js",
    path: outputPath,
    clean: true,
    publicPath: isProd ? "/perrla-free/word-addin/" : "/",
  },
  resolve: {
    extensions: [".ts", ".js"],
    extensionAlias: {
      ".js": [".ts", ".js"],
    },
    alias: {
      // $ = exact match only, prevents prefix-replacement for sub-paths
      "@perrla-free/core$": path.resolve(__dirname, "../core/src/index.ts"),
      "@perrla-free/core/engine": path.resolve(__dirname, "../core/src/engine.ts"),
      "@perrla-free/core/types": path.resolve(__dirname, "../core/src/types.ts"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            configFile: path.resolve(__dirname, "tsconfig.json"),
          },
        },
        include: [
          path.resolve(__dirname, "src"),
          path.resolve(__dirname, "../core/src"),
        ],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(csl|xml)$/,
        type: "asset/source",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
  ],
  devServer: {
    port: 3000,
    server: "https",
    static: {
      directory: path.resolve(__dirname, "dist"),
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
};
