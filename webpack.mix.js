const path = require('path')
const mix = require('laravel-mix')
require('laravel-mix-versionhash')
const fs = require('fs-extra') // Laravel Mix has fs-extra as dependency, we will reuse it
const readdirp = require('readdirp')
const CleanWebpackPlugin = require('clean-webpack-plugin')
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

mix.disableNotifications()

mix
  .js('resources/js/app.js', 'public/assets/js')
  .sass('resources/sass/app.scss', 'public/assets/css')

// Mix v4 has bug with setting public path with alongside enabled Webpack chunks (dynamic imports),
// so using Webpack's output.path variable (see: https://webpack.js.org/configuration/output/#outputpath)
// mix.setPublicPath('public/assets/dist/')

// Built-in Mix v4 files versioning not working as expected with alongside enabled Webpack chunks (dynamic imports),
// so using Webpack's output.filename variable (see: https://webpack.js.org/configuration/output/#outputfilename)
// mix.version()

// Provide source maps only for dev/debug
if (!mix.inProduction()) mix.sourceMaps()

if (mix.inProduction()) {
  mix.webpackConfig({
    plugins: [
      // Cleanup dist directory
      new CleanWebpackPlugin({
        // dry: true,
        // verbose: true,
        cleanOnceBeforeBuildPatterns: [
          'assets/dist/*',
          'dist/*'
        ]
      })
    ]
  })
  // Disabled until resolved: https://github.com/JeffreyWay/laravel-mix/issues/1889
  // mix.extract()
  // Additionally using `laravel-mix-versionhash` for generating correct Laravel Mix manifest file, as alternative for mix.version()
  mix.versionHash()
}

mix.webpackConfig({
  plugins: [
    // new BundleAnalyzerPlugin()
  ],
  resolve: {
    extensions: ['.js', '.json', '.vue'],
    alias: {
      '~': path.join(__dirname, './resources/js')
    }
  },
  output: {
    filename: mix.inProduction() ? '[name].[hash].js' : '[name].js',
    chunkFilename: mix.config.hmr ? 'assets/js/[name].js' : 'assets/js/[name].[chunkhash].js',
    path: mix.config.hmr ? '/' : path.resolve(__dirname, './public/dist')
  }
})

mix.then(stats => {
  // If we not in HMR mode, then publish assets
  if (!mix.config.hmr) {
    console.log('Compiled assets:')
    process.nextTick(() => {
      publishAseets()
    })
  }
})

// Helper function for publishing compiled assets to public at production environment (prevent 404)
async function publishAseets () {
  const dirPublic = path.resolve(__dirname, './public/')
  // Recursively walk through final assets directory to get list of old files
  const assetsOld = await readdirp.promise(path.join(dirPublic, 'assets'))
  // Copy compiled assets into final assets directory
  fs.copySync(path.join(dirPublic, 'dist', 'assets'), path.join(dirPublic, 'assets'))
  // Do some stuff with old assets only if we have them, we in production
  if (mix.inProduction() && assetsOld.length) {
    console.log('\nRemoving old assets:\n')
    // Walk through list of old aseets and remove them
    assetsOld.forEach(val => {
      console.log(path.join('assets', val.path).replace(/\\/g, '/'))
      fs.removeSync(val.fullPath)
    })
    // Re-copy dist assets if hashes (names) of some bundles were identical to old assets which we removed above
    fs.copySync(path.join(dirPublic, 'dist', 'assets'), path.join(dirPublic, 'assets'), { overwrite: false })
  }
  // No need dist directory anymore, so removing it
  fs.removeSync(path.join(dirPublic, 'dist'))
}

// Print Webpack config generated by Laravel Mix
// mix.dump()
