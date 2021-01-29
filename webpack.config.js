const path = require('path');

class PrintChunksPlugin {
    constructor({ fileName } = {}) {
        this._fileName = fileName;
    }

    apply (compiler) {
        compiler.plugin('compilation', compilation => {
            compilation.plugin('after-optimize-chunk-assets', chunks => {
                const chunkInfos = chunks.map(chunk => ({
                    id: chunk.id,
                    name: chunk.name,
                    modules: Array.from(chunk._modules).map(m => m.id)
                }));

                if (this._fileName != null) {
                    require("fs").writeFileSync(this._fileName, JSON.stringify(chunkInfos, null, '  '));
                } else {
                    console.log(JSON.stringify(chunkInfos, null, '  '));
                }
            })
        })
    }
}

module.exports = function(env, argv) {
    const mode = env.production ? 'production' : 'development';
    const buildSourceMap = env.srcmap;
    return [
        /**
         * Browserify xcrpc jsClient
         * This is packed as a part of the jsSDK now, but keep it in case we may
         * need a sep file in the future
         */
        // {
        //     target: "web",
        //     entry: path.resolve(env.buildroot, "assets/js/xcrpc/index.js"),
        //     mode: mode,
        //     output: {
        //         path: path.resolve(env.buildroot, 'assets/js/xcrpc'),
        //         library: 'xce',
        //         filename: 'libxce.js'
        //     },
        //     externals: {
        //         'require-context': 'notused',
        //     },
        //     node: {
        //         fs: 'empty',
        //         net: 'empty',
        //         tls: 'empty',
        //         setImmediate: false
        //     }
        // },

        /**
         * Browserify xcrpc jsSDK
         * It relies on jsClient source code
         */
        {
            target: "web",
            entry: path.resolve(env.buildroot, "assets/js/shared/Xcrpc/index.js"),
            mode: mode,
            output: {
                path: path.resolve(env.buildroot, 'assets/js/shared'),
                library: 'Xcrpc',
                filename: 'librpc.js'
            },
            externals: {
                'require-context': 'notused',
            },
            // Mimic a module from jsClient source code, so that we can use
            // require("xcalar") to access the jsClient
            resolve: {
                alias: {
                    'xcalar': path.resolve(env.buildroot, 'assets/js/xcrpc')
                }
            },
            // eval has the best performance, and reduces the build time by ~50%;
            // it matters especially to the watch task
            devtool: buildSourceMap ? 'eval' : '',
            node: {
                fs: 'empty',
                net: 'empty',
                tls: 'empty',
                setImmediate: false
            }
        },

        /**
         * Browserify parsers
         */
        {
            // We can add more to it, e.g. evalparser, etc. All of them share
            // one export target
            entry: path.resolve(env.buildroot, "assets/js/parser/index.js"),
            mode: mode,
            output: {
                path: path.resolve(env.buildroot, 'assets/js/shared/parser'),
                library: 'XDParser',
                filename: "antlrParser.js"
            },
            node: {
                module: "empty",
                net: "empty",
                fs: "empty"
            }
        },

        // Compile tsx
        {
            entry: path.resolve(env.buildroot, "src/index.tsx"),
            output: {
                path: path.resolve(env.buildroot, "assets/js/"),
                filename: "react.js"
            },
            resolve: {
                extensions: [".ts", ".tsx", ".js"]
            },
            devtool: buildSourceMap ? 'eval' : '',
            module: {
                rules: [{
                    test: /\.tsx?$/,
                    loader: ["ts-loader"],
                    exclude: /node_modules/
                }]
            }
        },

        // Load Wizard
        {
            entry: {
                // loadWizard: path.resolve(env.buildroot, "src/loadWizard/index.jsx"),
                loadWizardXD: path.resolve(env.buildroot, "src/loadWizard/index2.jsx"),
                test: path.resolve(env.buildroot, "src/loadWizard/test.js")
            },
            output: {
                path: path.resolve(env.buildroot, "assets/js/loadWizard/"),
                filename: "[name].js"
            },
            resolve: {
                extensions: [".ts", ".tsx", ".js", ".jsx", ".less"]
            },
            devtool: buildSourceMap ? 'eval-source-map' : '',
            mode: mode,
            optimization: {
                splitChunks: {
                    cacheGroups: {
                        defaultVendors: {
                            // test: /[\\/]node_modules[\\/](react|react-dom|react-table|react-virtualized|recharts)[\\/]/,
                            test: /[\\/]node_modules[\\/]/,
                            name: "vendors",
                            chunks: 'initial'
                        }
                    },
                },
            },
            // plugins: [
            //     new PrintChunksPlugin({fileName: path.resolve(env.buildroot, "loadwizard_stats.json")}),
            // ],
            module: {
                rules: [
                    {
                        test: /\.tsx?$/,
                        loader: "ts-loader",
                        options: {
                            // context: where to find tsconfig.json
                            context: path.resolve(env.buildroot, "src")
                        },
                        exclude: /node_modules/
                    },
                    {
                        test: /\.jsx?$/,
                        loader: "babel-loader",
                        options: {
                            presets: ['react', 'es2016'],
                            plugins: ["transform-object-rest-spread"]
                        },
                        exclude: /node_modules/
                    },
                    {
                        test: /\.less$/,
                        use: [
                            {
                            loader: 'style-loader', // creates style nodes from JS strings
                            },
                            {
                            loader: 'css-loader', // translates CSS into CommonJS
                            },
                            {
                            loader: 'less-loader', // compiles Less to CSS
                            },
                        ]
                    },
                    {
                        test: /\.css$/,
                        loaders: ['style-loader', 'css-loader'],
                        exclude: /node_modules/
                    }
                ]
            },
        }
    ];
};
