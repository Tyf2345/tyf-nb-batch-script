import path from 'path';
import { getBasePollupPlugins } from './utils';
const pkgPath = (dir) => path.resolve(__dirname, '../../', dir);
export default [
	{
		input: pkgPath('src/index.ts'),
		output: {
			file: pkgPath('build/index.js'),
			name: 'index.js',
			format: 'umd'
		},
		plugins: getBasePollupPlugins()
	}
];
