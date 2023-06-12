(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined'
		? (module.exports = factory(
				require('shelljs'),
				require('chalk'),
				require('fs-extra'),
				require('lodash/merge'),
				require('crypto'),
				require('ora'),
				require('path'),
				require('figlet'),
				require('inquirer')
		  ))
		: typeof define === 'function' && define.amd
		? define(
				[
					'shelljs',
					'chalk',
					'fs-extra',
					'lodash/merge',
					'crypto',
					'ora',
					'path',
					'figlet',
					'inquirer'
				],
				factory
		  )
		: ((global =
				typeof globalThis !== 'undefined' ? globalThis : global || self),
		  ((global.index = global.index || {}),
		  (global.index.js = factory(
				global.shelljs,
				global.chalk,
				global.fsExtra,
				global.merge,
				global.crypto,
				global.ora,
				global.path,
				global.figlet,
				global.inquirer
		  ))));
})(
	this,
	function (
		shelljs,
		chalk,
		fsExtra,
		merge,
		crypto,
		ora,
		path,
		figlet,
		inquirer
	) {
		'use strict';

		const DEPENDENCIES = 'dependencies';
		const DEV_DEPENDENCIES = 'devDependencies';
		const NODE_MODULES = 'node_modules';
		const PREFIX_NB = 'nb-';

		function random() {
			return crypto.randomUUID();
		}
		/**
		 *
		 * @returns 项目更目录 全路径
		 */
		function getRootDir() {
			return process.cwd();
		}
		function getPackageJSON(pkgPath) {
			const path = `${pkgPath}/package.json`;
			const pkgStatus = fsExtra.existsSync(path);
			if (!pkgStatus) {
				throw new Error(chalk.red(`路径${path}不存在`));
			}
			const str = fsExtra.readFileSync(path, { encoding: 'utf-8' }).toString();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return JSON.parse(str);
		}
		function getModulesRootDir() {
			const path = `${getRootDir()}/src/center-modules/${DEPENDENCIES}`;
			if (!fsExtra.existsSync(path)) {
				dfsCreateDir(path);
			}
			return path;
		}
		function getModulesDEVRootDir() {
			const path = `${getRootDir()}/src/center-modules/${DEV_DEPENDENCIES}`;
			if (!fsExtra.existsSync(path)) {
				dfsCreateDir(path);
			}
			return path;
		}
		// 获取所有模块名
		function getAllModuleName() {
			return [
				...fsExtra.readdirSync(getModulesRootDir()),
				...fsExtra.readdirSync(getModulesDEVRootDir())
			];
		}
		// 获取所有模块信息
		function getAllModuleInfo() {
			return [
				...fsExtra.readdirSync(getModulesRootDir()).map((fileName) => ({
					fileName,
					relativeUrl: `src/center-modules/${DEPENDENCIES}`,
					type: DEPENDENCIES
				})),
				...fsExtra.readdirSync(getModulesDEVRootDir()).map((fileName) => ({
					fileName,
					relativeUrl: `src/center-modules/${DEV_DEPENDENCIES}`,
					type: DEV_DEPENDENCIES
				}))
			];
		}
		const dfsCreateDir = (targetDir) => {
			if (fsExtra.existsSync(targetDir)) {
				return true;
			} else {
				if (dfsCreateDir(path.dirname(targetDir))) {
					fsExtra.mkdirSync(targetDir);
					return true;
				}
			}
		};
		const _dfsCreateDir = dfsCreateDir;
		function setWebpackAlias(dirList, type) {
			let str = '';
			dirList.forEach((dirName) => {
				str += `
            '${dirName}': utils.resolve('src/center-modules/${type}/${dirName}'),`;
			});
			return str;
		}
		function handleNodeModulesReplace(path) {
			let webpackStr = fsExtra
				.readFileSync(path, { encoding: 'utf-8' })
				.toString();
			const webpackList = webpackStr.split(`${NODE_MODULES}/`);
			const allModuleInfo = getAllModuleInfo();
			for (let i = 0; i < webpackList.length; i++) {
				let flag = false;
				for (let j = 0; j < allModuleInfo.length; j++) {
					if (
						webpackList[i].includes(allModuleInfo[j].fileName) &&
						!webpackList[i].includes(allModuleInfo[j].fileName + '-')
					) {
						webpackList[
							i
						] = `${allModuleInfo[j].relativeUrl}/${webpackList[i]}`;
						flag = true;
					}
				}
				if (!flag && i !== 0) {
					webpackList[i] = `${NODE_MODULES}/${webpackList[i]}`;
				}
			}
			webpackStr = webpackList.join('');
			return webpackStr;
		}
		/**
		 * 终端标题打印
		 */
		function logTips() {
			console.log(
				chalk.green(
					figlet.textSync('nb batch script', {
						font: 'Ghost'
					})
				)
			);
		}
		/**
		 * 终端cli 选项
		 * @returns inquirer
		 */
		function askQuetions() {
			const questions = [
				{
					type: 'list',
					name: 'projectType',
					message: '请选择项目类型',
					choices: ['js', 'ts']
				},
				{
					type: 'confirm',
					name: 'pkgCover',
					message: `是否覆盖当前${chalk.blue('package.json')}`
				}
			];
			return inquirer.prompt(questions);
		}
		async function oraTips(
			cb,
			option = {
				//   text: "loading...",
				prefixText: '模块下载中',
				color: 'yellow',
				spinner: {
					interval: 80,
					frames: ['-', '+', '-']
				},
				hideCursor: true
			}
		) {
			const spinner = ora(option);
			spinner.start();
			await cb();
			// console.clear()
			spinner.stop();
		}
		/**
		 * 打印模块信息（模块数、耗时）
		 * @param {*} cb
		 */
		async function printInfoWrap(cb) {
			const startTime = Date.now();
			await oraTips(cb);
			const endTime = Date.now();
			const dependenciesCount = fsExtra.readdirSync(getModulesRootDir()).length;
			const devDependenciesCount = fsExtra.readdirSync(
				getModulesDEVRootDir()
			).length;
			const allCount = dependenciesCount + devDependenciesCount;
			console.log('🐛💐🎉👏👏🎉💐🐛');
			console.log(
				`共处理模块：${chalk.blue.bold(allCount)} 个，其中${chalk.green.bold(
					' dependencies '
				)}模块 ${chalk.red.bold(dependenciesCount)} 个，${chalk.green.bold(
					' devDependencies '
				)}模块 ${chalk.red.bold(devDependenciesCount)} 个`
			);
			console.log(
				`批处理脚本总耗时：${chalk.yellow.bold(endTime - startTime)} 毫秒`
			);
		}

		// async function downloadModule(targetDir, path, fileName) {
		//   const fileBuffer = await axios.get(path, {
		//     responseType: "arraybuffer",
		//   });
		//   const newTargetDir = `${targetDir}/${random()}`;
		//   dfsCreateDir(targetDir);
		//   await compressing.tgz.uncompress(fileBuffer.data, newTargetDir);
		//   console.log(chalk.blue(newTargetDir));
		//   await fs.move(`${newTargetDir}/package`, `${targetDir}/${fileName}`);
		//   await fs.remove(newTargetDir);
		//   return getPackageJSON(`${targetDir}/${fileName}`);
		// }
		async function moveModule(targetDir, fileName) {
			const targetPath = `${targetDir}/${fileName}`;
			_dfsCreateDir(targetDir);
			console.log(
				chalk.blue(
					`正在移动nb包: ${NODE_MODULES}/${fileName} 至 ${targetDir}文件夹下`
				)
			);
			shelljs.mv(
				`${getRootDir()}/${NODE_MODULES}/${fileName}/`,
				targetPath + '/'
			);
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
			await fsExtra.writeFile(
				`${getRootDir()}/package.json`,
				JSON.stringify(packageJSON, null, 2)
			);
		}
		/**
		 * 移动根目录package.json下的nb模块到 center-modules/[dependencies | devDependencies ]下
		 */
		async function moveRootModules() {
			const rootPackageJSON = getPackageJSON(`${getRootDir()}`);
			const { dependencies = {}, devDependencies = {} } = rootPackageJSON;
			const nbDependciesPath = [];
			const nbDevDependciesPath = [];
			for (const pkgName in dependencies) {
				if (pkgName.startsWith(PREFIX_NB)) {
					nbDependciesPath.push({
						fileName: pkgName
					});
				}
			}
			for (const pkgName in devDependencies) {
				if (pkgName.startsWith(PREFIX_NB)) {
					nbDevDependciesPath.push({
						fileName: pkgName
					});
				}
			}
			for (let i = 0; i < nbDependciesPath.length; i++) {
				const { fileName } = nbDependciesPath[i];
				await moveModule(getModulesRootDir(), fileName);
			}
			for (let i = 0; i < nbDevDependciesPath.length; i++) {
				const { fileName } = nbDevDependciesPath[i];
				await moveModule(getModulesDEVRootDir(), fileName);
			}
		}
		function getDependciesList(allModuleNames, data, type) {
			const list = [];
			for (const pkgName in data) {
				if (
					pkgName.startsWith(PREFIX_NB) &&
					!allModuleNames.includes(pkgName)
				) {
					list.push({
						fileName: pkgName,
						type: type
					});
				}
			}
			return list;
		}
		/**
		 * 移动 依赖模块 package.json下的nb模块到 center-modules/[dependencies | devDependencies ]下
		 */
		async function moveDependciesModules() {
			const allModuleNames = getAllModuleName();
			let queue = [];
			const modulesRootDir = getModulesRootDir();
			const modulesDirs = fsExtra.readdirSync(modulesRootDir);
			for (let i = 0; i < modulesDirs.length; i++) {
				const modulesDir = modulesDirs[i];
				const { dependencies = {}, devDependencies = {} } = getPackageJSON(
					`${modulesRootDir}/${modulesDir}`
				);
				queue = [
					...queue,
					...getDependciesList(allModuleNames, dependencies, DEPENDENCIES),
					...getDependciesList(
						allModuleNames,
						devDependencies,
						DEV_DEPENDENCIES
					)
				];
			}
			while (queue.length > 0) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const { fileName, type } = queue.pop();
				const { dependencies = {}, devDependencies = {} } = await moveModule(
					type === DEPENDENCIES ? getModulesRootDir() : getModulesDEVRootDir(),
					fileName
				);
				queue = [
					...queue,
					...getDependciesList(allModuleNames, dependencies, DEPENDENCIES),
					...getDependciesList(
						allModuleNames,
						devDependencies,
						DEV_DEPENDENCIES
					)
				];
			}
		}
		function handleWriteWebpack() {
			let webpackStr = handleNodeModulesReplace(
				`${getRootDir()}/build/webpack.js`
			);
			if (webpackStr.includes('merge(require("./webpack-alias")')) return;
			const webpackAlias = `{
    app: {
      configureWebpack: {
        resolve: {
          alias: {
            ${setWebpackAlias(
							fsExtra.readdirSync(getModulesRootDir()),
							DEPENDENCIES
						)}${setWebpackAlias(
				fsExtra.readdirSync(getModulesDEVRootDir()),
				DEV_DEPENDENCIES
			)}
          }
        }
      }
    }
  }`;
			// 重写webpack
			fsExtra.writeFileSync(
				`${getRootDir()}/build/webpack-alias.js`,
				`const utils = require('./utils')\r\nmodule.exports = ${webpackAlias}`
			);
			webpackStr = webpackStr.replace(
				'module.exports = merge(',
				'module.exports = merge(require("./webpack-alias"),'
			);
			fsExtra.writeFileSync(`${getRootDir()}/build/webpack.js`, webpackStr);
		}
		function handleWriteProxyHook() {
			const path = `${getRootDir()}/build/proxy-hook.js`;
			const str = fsExtra
				.readFileSync(path, { encoding: 'utf-8' })
				.toString()
				.replace(
					/nb-http-proxy/g,
					`../src/center-modules/devDependencies/nb-http-proxy`
				);
			fsExtra.writeFileSync(path, str);
		}
		function handleWritePackage(isCover = false) {
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
				const { dependencies = {}, devDependencies = {} } = getPackageJSON(
					`${getRootDir()}/${relativeUrl}/${fileName}`
				);
				_dependencies = merge(_dependencies, dependencies);
				_devDependencies = merge(_devDependencies, devDependencies);
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
				fsExtra.writeFileSync(`${getRootDir()}/package.json`, pkgJSONStr);
			} else {
				fsExtra.writeFileSync(
					`${getRootDir()}/package.${random()}.json`,
					pkgJSONStr
				);
			}
		}
		function handleWriteTsconfig(isCover = false) {
			const path = `${getRootDir()}/tsconfig.json`;
			if (!fsExtra.existsSync(path)) {
				throw new Error(chalk.red(`路径:${path} 不存在`));
			}
			const tsconfig = JSON.parse(handleNodeModulesReplace(path));
			if (!tsconfig.compilerOptions.paths) {
				tsconfig.compilerOptions.paths = {};
			}
			const allModuleInfo = getAllModuleInfo();
			allModuleInfo.forEach((moduleInfo) => {
				const { fileName, relativeUrl } = moduleInfo;
				if (!tsconfig.compilerOptions.paths[fileName]) {
					tsconfig.compilerOptions.paths[fileName] = [
						`${relativeUrl}/${fileName}`
					];
				}
			});
			const tsconfigStr = JSON.stringify(tsconfig, null, 2);
			if (isCover) {
				fsExtra.writeFileSync(path, tsconfigStr);
			} else {
				fsExtra.writeFileSync(
					`${getRootDir()}/tsconfig.${random()}.json`,
					tsconfigStr
				);
			}
		}
		function handleWriteFile(pkgCover = false, projectType) {
			handleWriteWebpack();
			handleWriteProxyHook();
			if (projectType === 'ts') {
				handleWriteTsconfig(true);
			}
			handleWritePackage(pkgCover);
		}
		function init() {
			logTips();
		}
		async function run() {
			init();
			const { pkgCover, projectType } = await askQuetions();
			// promise reject 捕获
			process.on('unhandledRejection', async (res, p) => {
				console.log(chalk.red.bold('res:', res, 'p:', p));
				console.log(chalk.red.bold('程序退出！'));
				process.exit(0);
			});
			printInfoWrap(async () => {
				await fsExtra.remove(getModulesRootDir());
				await fsExtra.remove(getModulesDEVRootDir());
				await arrangeRootPackageJson();
				await moveRootModules();
				await moveDependciesModules();
				handleWriteFile(pkgCover, projectType);
			});
		}

		return run;
	}
);
