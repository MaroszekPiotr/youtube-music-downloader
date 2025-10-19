import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  target: 'node',
  mode: 'production',
  entry: {
    index: './dist/index.js',
    cli: './dist/presentation/cli/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@domain': path.resolve(__dirname, 'dist/domain'),
      '@application': path.resolve(__dirname, 'dist/application'),
      '@infrastructure': path.resolve(__dirname, 'dist/infrastructure'),
      '@presentation': path.resolve(__dirname, 'dist/presentation'),
      '@shared': path.resolve(__dirname, 'dist/shared')
    }
  },
  externals: {
    'fpcalc': 'commonjs2 fpcalc',
    'ytdl-core': 'commonjs2 ytdl-core'
  }
};
