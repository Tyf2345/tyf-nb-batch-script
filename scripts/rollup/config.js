import path from 'path';
// import generatePackageJson from 'rollup-plugin-generate-package-json';
import { getBasePollupPlugins } from './utils';
const pkgPath = (dir = '') => path.resolve(__dirname, '../../', dir);
export default [
	{
		input: pkgPath('src/index.ts'),
		output: {
			file: pkgPath('build/index.js'),
			name: 'index.js',
			format: 'umd'
		},
		plugins: [
			...getBasePollupPlugins()
			// generatePackageJson({
			// 	inputFolder: pkgPath(),
			// 	outputFolder: pkgPath('dist/'),
			// 	baseContents: (pkgJson) => ({
			// 		...pkgJson
			// 	})
			// })
		]
	}
];
