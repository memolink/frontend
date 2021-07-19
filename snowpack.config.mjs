import path from 'path'
import proxy from 'http2-proxy';

/** @type {import("snowpack").SnowpackUserConfig } */
export default {
  alias: {
    '@': path.resolve(path.dirname(''), 'src'),
    'ui': path.resolve(path.dirname(''), 'src/ui'),
    'feat': path.resolve(path.dirname(''), 'src/feat'),
    'hooks': path.resolve(path.dirname(''), 'src/hooks'),
    'api': path.resolve(path.dirname(''), 'src/api'),
    'models': path.resolve(path.dirname(''), 'src/models'),
    'assets': path.resolve(path.dirname(''), 'src/assets'),
    'images': path.resolve(path.dirname(''), 'src/assets/images'),
  },
  root: './src/',
  mount: {
    src: '/', // without this snowpack is telling: [21:54:38] [snowpack] [404] Not Found (/) (x2)
  },
  plugins: [
    '@snowpack/plugin-sass',
    [
      "snowpack-plugin-rollup-bundle",
      {
        emitHtmlFiles: true,
        preserveSourceFiles: false,
  
        // equivalent to inputOptions.input from Rollup
        entrypoints: "build/index.jsx",
  
        extendConfig: (config) => {
          // https://rollupjs.org/guide/en/#outputoptions-object
          //config.outputOptions = { ... }
  
          // https://rollupjs.org/guide/en/#inputoptions-object
          //config.inputOptions = { ... }
  
          return config
        }
      }
    ]
  ],
  routes: [   {
    src: '/api/.*',
    dest: (req, res) => {
      // remove /api prefix (optional)
      req.url = req.url.replace(/^\/api/, '');

      return proxy.web(req, res, {
        hostname: 'localhost',
        port: 3001,
      });
    },
  },
  ],
  optimize: {
    /* Example: Bundle your final build: */
    // "bundle": true,
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    port: 8081,
    open: 'none'
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
};
