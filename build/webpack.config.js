/**
 * ReplyCators — Webpack Build Configuration
 * Compiles TypeScript, bundles modules, and copies static assets to dist/
 */

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const ROOT    = path.resolve(__dirname, '..');
const SRC     = path.resolve(ROOT, 'src');
const DIST    = path.resolve(ROOT, 'dist');
const PLUGINS = path.resolve(ROOT, 'plugins');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'cheap-module-source-map' : false,

    entry: {
      // Service worker (background)
      'background': path.join(SRC, 'background', 'service-worker.ts'),
      // Dashboard popup
      'dashboard':  path.join(SRC, 'popup', 'dashboard.ts'),
    },

    output: {
      path: DIST,
      filename: '[name].js',
      clean: true,
    },

    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@replycators/sdk':          path.resolve(SRC, 'sdk', 'index.ts'),
        '@replycators/core':         path.resolve(SRC, 'core'),
        '@replycators/platform':     path.resolve(SRC, 'platform'),
        // Normalise stale relative-path imports that resolve to the project root
        // instead of src/ (i.e. plugins using ../../.. instead of ../..):
        [path.resolve(ROOT, 'sdk')]:      path.resolve(SRC, 'sdk'),
        [path.resolve(ROOT, 'platform')]: path.resolve(SRC, 'platform'),
        [path.resolve(ROOT, 'core')]:     path.resolve(SRC, 'core'),
      },
    },

    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: { transpileOnly: isDev },
          },
          exclude: /node_modules/,
        },
      ],
    },

    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          // Manifest
          { from: path.join(ROOT, 'manifest.json'), to: 'manifest.json' },

          // Apptio fallback schedule — owned by ApptioUpgradeCalculator plugin.
          // Source: plugins/apptio-upgrade-calculator/apptio-schedule.json
          // Final package path: plugins/apptio-upgrade-calculator/apptio-schedule.json
          // (manifest web_accessible_resources and chrome.runtime.getURL use this path)
          {
            from: path.join(PLUGINS, 'apptio-upgrade-calculator', 'apptio-schedule.json'),
            to:   'plugins/apptio-upgrade-calculator/apptio-schedule.json',
          },

          // Dashboard HTML → root of dist
          { from: path.join(SRC, 'popup', 'dashboard.html'), to: 'dashboard.html',
            transform: (content) => content.toString()
              .replace('../assets/styles/platform.css', 'styles/platform.css')
              .replace('../assets/styles/dashboard.css', 'styles/dashboard.css')
          },

          // Options page
          { from: path.join(SRC, 'popup', 'options.html'), to: 'options.html', noErrorOnMissing: true,
            transform: (content) => content.toString()
              .replace('../assets/styles/platform.css', 'styles/platform.css')
          },

          // CSS — source of truth is root styles/ (authoritative active CSS).
          { from: path.join(ROOT, 'styles'), to: 'styles' },

          // Icons (source: assets/icons/ → dist/assets/icons/ matching root layout)
          { from: path.join(ROOT, 'assets', 'icons'), to: 'assets/icons', noErrorOnMissing: true },

          // Salesforce content script — owned by Salesforce plugin.
          // Source: plugins/salesforce/content/sf-content.js
          // Final package path: plugins/salesforce/content/sf-content.js
          // (manifest content_scripts and chrome.scripting.executeScript use this path)
          {
            from: path.join(PLUGINS, 'salesforce', 'content', 'sf-content.js'),
            to:   'plugins/salesforce/content/sf-content.js',
          },

          // CloudabilityOrgId content scripts — placed under plugins/cloudability/content/
          // matching the source and runtime layout.
          {
            from: path.join(SRC, 'plugins', 'CloudabilityOrgId', 'content', 'cloudability-interceptor.js'),
            to:   'plugins/cloudability/content/cloudability-interceptor.js',
          },
          {
            from: path.join(SRC, 'plugins', 'CloudabilityOrgId', 'content', 'cloudability-detector.js'),
            to:   'plugins/cloudability/content/cloudability-detector.js',
          },
        ],
      }),
    ],

    optimization: {
      // Do NOT split the service worker — Chrome requires a single service_worker file
      splitChunks: false,
      runtimeChunk: false,
    },
  };
};
