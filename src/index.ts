import { mv } from 'shelljs';
import { blue, red } from 'chalk';
import {
	writeFile,
	readdirSync,
	writeFileSync,
	readFileSync,
	existsSync,
	remove,
	move
} from 'fs-extra';
import axios from 'axios';
import compressing from 'compressing';
import merge from 'lodash/merge';
import {
	random,
	getPackageJSON,
	getRootDir,
	dfsCreateDir,
	getModulesRootDir,
	getModulesDEVRootDir,
	getAllModuleName,
	printInfoWrap,
	setWebpackAlias,
	getAllModuleInfo,
	handleNodeModulesReplace,
	logTips,
	askQuetions
} from './uitls/index';
import {
	DEPENDENCIES,
	DEV_DEPENDENCIES,
	PREFIX_NB,
	NODE_MODULES,
	DEFAULT_EXCLUDE_MERGE_FILES
} from './constants/index';
import {
	INbDependciesFileNameAndType,
	INbDependciesFileName,
	TProjectType
} from './types';
import { TNbDependciesType } from './types';
import { TProjectMode } from './types';

async function downloadModule(
	targetDir: string,
	path: string,
	fileName: string
) {
	const fileBuffer = await axios.get(path, {
		responseType: 'arraybuffer'
	});
	const newTargetDir = `${targetDir}/${random()}`;
	dfsCreateDir(targetDir);
	await compressing.tgz.uncompress(fileBuffer.data, newTargetDir);
	console.log(blue(`正在下载nb包: ${fileName} 至 ${targetDir}文件夹下`));
	await move(`${newTargetDir}/package`, `${targetDir}/${fileName}`);
	await remove(newTargetDir);
	return getPackageJSON(`${targetDir}/${fileName}`);
}

async function moveModule(targetDir: string, fileName: string) {
	const targetPath = `${targetDir}/${fileName}`;
	dfsCreateDir(targetDir);
	console.log(
		blue(`正在移动nb包: ${NODE_MODULES}/${fileName} 至 ${targetDir}文件夹下`)
	);
	mv(`${getRootDir()}/${NODE_MODULES}/${fileName}/`, targetPath + '/');
	return getPackageJSON(targetPath);
}

/**
 * 清理 根目录 package.json
 */
async function arrangeRootPackageJson() {
	const packageJSON = getPackageJSON(getRootDir());
	const { dependencies = {}, devDependencies = {} } = packageJSON;
	for (const pkgName in dependencies) {
		if (devDependencies[pkgName]) {
			delete devDependencies[pkgName];
		}
	}
	packageJSON.devDependencies = devDependencies;
	await writeFile(
		`${getRootDir()}/package.json`,
		JSON.stringify(packageJSON, null, 2)
	);
	console.log(red.bold('package.json整理完成'));
}

/**
 * 处理模块
 */
async function handleModules(projectMode: TProjectMode) {
	await moveRootModules(projectMode);
	await moveDependciesModules(projectMode);
}
/**
 * 移动根目录package.json下的nb模块到 center-modules/[dependencies | devDependencies ]下
 */
async function moveRootModules(projectMode: TProjectMode) {
	const rootPackageJSON = getPackageJSON(`${getRootDir()}`);
	const { dependencies = {}, devDependencies = {} } = rootPackageJSON;
	const nbDependciesPath: INbDependciesFileName[] = [];
	const nbDevDependciesPath: INbDependciesFileName[] = [];
	for (const pkgName in dependencies) {
		if (pkgName.startsWith(PREFIX_NB)) {
			nbDependciesPath.push({
				url: getPackageJSON(`${getRootDir()}/${NODE_MODULES}/${pkgName}`)
					._resolved,
				fileName: pkgName
			});
		}
	}
	for (const pkgName in devDependencies) {
		if (pkgName.startsWith(PREFIX_NB)) {
			nbDevDependciesPath.push({
				url: getPackageJSON(`${getRootDir()}/${NODE_MODULES}/${pkgName}`)
					._resolved,
				fileName: pkgName
			});
		}
	}
	for (let i = 0; i < nbDependciesPath.length; i++) {
		const { fileName, url } = nbDependciesPath[i];
		if (projectMode === 'move') {
			await moveModule(getModulesRootDir(), fileName);
		} else {
			await downloadModule(getModulesRootDir(), url, fileName);
		}
	}
	for (let i = 0; i < nbDevDependciesPath.length; i++) {
		const { fileName, url } = nbDevDependciesPath[i];
		if (projectMode === 'move') {
			await moveModule(getModulesDEVRootDir(), fileName);
		} else {
			await downloadModule(getModulesDEVRootDir(), url, fileName);
		}
	}
}

function getDependciesList(
	allModuleNames: string[],
	data: Record<string, unknown>,
	type: TNbDependciesType
) {
	const list: INbDependciesFileNameAndType[] = [];
	for (const pkgName in data) {
		if (pkgName.startsWith(PREFIX_NB) && !allModuleNames.includes(pkgName)) {
			const path = `${getRootDir()}/${NODE_MODULES}/${pkgName}`;
			list.push({
				fileName: pkgName,
				url: getPackageJSON(path)._resolved,
				type: type
			});
		}
	}
	return list;
}
/**
 * 移动 依赖模块 package.json下的nb模块到 center-modules/[dependencies | devDependencies ]下
 */
async function moveDependciesModules(projectMode: TProjectMode) {
	const allModuleNames = getAllModuleName();

	let queue: INbDependciesFileNameAndType[] = [];
	const modulesRootDir = getModulesRootDir();
	const modulesDirs = readdirSync(modulesRootDir);
	for (let i = 0; i < modulesDirs.length; i++) {
		const modulesDir = modulesDirs[i];
		const { dependencies = {}, devDependencies = {} } = getPackageJSON(
			`${modulesRootDir}/${modulesDir}`
		);
		queue = [
			...queue,
			...getDependciesList(allModuleNames, dependencies, DEPENDENCIES),
			...getDependciesList(allModuleNames, devDependencies, DEV_DEPENDENCIES)
		];
	}
	while (queue.length > 0) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const { fileName, type, url } = queue.pop()!;
		let dependencies = {};
		let devDependencies = {};
		if (projectMode === 'move') {
			const {
				dependencies: _dependencies = {},
				devDependencies: _devDependencies = {}
			} = await moveModule(
				type === DEPENDENCIES ? getModulesRootDir() : getModulesDEVRootDir(),
				fileName
			);
			dependencies = _dependencies;
			devDependencies = _devDependencies;
		} else {
			const {
				dependencies: _dependencies = {},
				devDependencies: _devDependencies = {}
			} = await downloadModule(
				type === DEPENDENCIES ? getModulesRootDir() : getModulesDEVRootDir(),
				url,
				fileName
			);
			dependencies = _dependencies;
			devDependencies = _devDependencies;
		}

		queue = [
			...queue,
			...getDependciesList(allModuleNames, dependencies, DEPENDENCIES),
			...getDependciesList(allModuleNames, devDependencies, DEV_DEPENDENCIES)
		];
	}
}

function handleWriteWebpack() {
	let webpackStr = handleNodeModulesReplace(`${getRootDir()}/build/webpack.js`);
	if (webpackStr.includes('merge(require("./webpack-alias")')) return;
	const webpackAlias = `{
    app: {
      configureWebpack: {
        resolve: {
          alias: {
            ${setWebpackAlias(
							readdirSync(getModulesRootDir()),
							DEPENDENCIES
						)}${setWebpackAlias(
		readdirSync(getModulesDEVRootDir()),
		DEV_DEPENDENCIES
	)}
          }
        }
      }
    }
  }`;
	// 重写webpack
	writeFileSync(
		`${getRootDir()}/build/webpack-alias.js`,
		`const utils = require('./utils')\r\nmodule.exports = ${webpackAlias}`
	);
	webpackStr = webpackStr.replace(
		'module.exports = merge(',
		'module.exports = merge(require("./webpack-alias"),'
	);
	writeFileSync(`${getRootDir()}/build/webpack.js`, webpackStr);
}
function handleWriteProxyHook() {
	const path = `${getRootDir()}/build/proxy-hook.js`;
	const str = readFileSync(path, { encoding: 'utf-8' })
		.toString()
		.replace(
			/nb-http-proxy/g,
			`../src/center-modules/devDependencies/nb-http-proxy`
		);
	writeFileSync(path, str);
}
function handleWritePackage(excludeFiles: string[], isCover = false) {
	const pkgJSON = getPackageJSON(getRootDir());
	const {
		dependencies: pkgDependencies,
		devDependencies: pkgDdevDependencies
	} = pkgJSON;
	let _dependencies = {};
	let _devDependencies = {};
	const allModuleInfo = getAllModuleInfo();
	allModuleInfo.forEach((moduleInfo) => {
		const { fileName, relativeUrl } = moduleInfo;
		if (!excludeFiles.includes(fileName)) {
			const { dependencies = {}, devDependencies = {} } = getPackageJSON(
				`${getRootDir()}/${relativeUrl}/${fileName}`
			);
			_dependencies = merge(_dependencies, dependencies);
			_devDependencies = merge(_devDependencies, devDependencies);
		}
	});
	_dependencies = merge(_dependencies, pkgDependencies);
	_devDependencies = merge(_devDependencies, pkgDdevDependencies);
	for (const pkgName in _dependencies) {
		if (pkgName.startsWith(PREFIX_NB)) {
			delete _dependencies[pkgName];
		}
	}
	for (const pkgName in _devDependencies) {
		if (pkgName.startsWith(PREFIX_NB)) {
			delete _devDependencies[pkgName];
		}
	}

	for (const pkgName in _dependencies) {
		for (const devPkgName in _devDependencies) {
			if (pkgName === devPkgName) {
				delete _devDependencies[devPkgName];
			}
		}
	}

	pkgJSON.dependencies = _dependencies;
	pkgJSON.devDependencies = _devDependencies;
	const pkgJSONStr = JSON.stringify(pkgJSON, null, 2);
	if (isCover) {
		writeFileSync(`${getRootDir()}/package.json`, pkgJSONStr);
	} else {
		writeFileSync(`${getRootDir()}/package.${random()}.json`, pkgJSONStr);
	}
}
function handleWriteTsconfig(isCover = false) {
	const path = `${getRootDir()}/tsconfig.json`;
	if (!existsSync(path)) {
		throw new Error(red(`路径:${path} 不存在`));
	}

	const tsconfig = JSON.parse(handleNodeModulesReplace(path));
	if (!tsconfig.compilerOptions.paths) {
		tsconfig.compilerOptions.paths = {};
	}
	const allModuleInfo = getAllModuleInfo();
	allModuleInfo.forEach((moduleInfo) => {
		const { fileName, relativeUrl } = moduleInfo;
		if (!tsconfig.compilerOptions.paths[fileName]) {
			tsconfig.compilerOptions.paths[fileName] = [`${relativeUrl}/${fileName}`];
		}
	});
	const tsconfigStr = JSON.stringify(tsconfig, null, 2);
	if (isCover) {
		writeFileSync(path, tsconfigStr);
	} else {
		writeFileSync(`${getRootDir()}/tsconfig.${random()}.json`, tsconfigStr);
	}
}

function handleWriteFile(
	excludeFiles: string[],
	pkgCover = false,
	projectType: TProjectType
) {
	handleWriteWebpack();
	handleWriteProxyHook();
	if (projectType === 'ts') {
		handleWriteTsconfig(true);
	}
	handleWritePackage(excludeFiles, pkgCover);
}

async function run(
	tips = 'nb batch script',
	excludeMergeFiles = DEFAULT_EXCLUDE_MERGE_FILES
) {
	logTips(tips);
	const { pkgCover, projectType, projectMode } = await askQuetions();
	// promise reject 捕获
	process.on('unhandledRejection', async (res, p) => {
		console.log(red.bold('res:', res, 'p:', p));
		console.log(red.bold('程序退出！'));
		process.exit(0);
	});

	printInfoWrap(async () => {
		await remove(getModulesRootDir());
		await remove(getModulesDEVRootDir());
		await arrangeRootPackageJson();
		await handleModules(projectMode);
		handleWriteFile(excludeMergeFiles, pkgCover, projectType);
	});
}
export default run;
