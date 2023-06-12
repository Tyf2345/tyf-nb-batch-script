import ts from 'rollup-plugin-typescript2';
import cjs from '@rollup/plugin-commonjs';
export function getBasePollupPlugins({ typescript = {} } = {}) {
	return [cjs(), ts(typescript)];
}
