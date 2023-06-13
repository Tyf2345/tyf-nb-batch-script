(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('shelljs'), require('chalk'), require('fs-extra'), require('axios'), require('compressing'), require('lodash/merge'), require('crypto'), require('ora'), require('path'), require('figlet'), require('inquirer')) :
	typeof define === 'function' && define.amd ? define(['shelljs', 'chalk', 'fs-extra', 'axios', 'compressing', 'lodash/merge', 'crypto', 'ora', 'path', 'figlet', 'inquirer'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, (global.index = global.index || {}, global.index.js = factory(null, global.chalk, global.fsExtra, null, null, null, null, global.ora, global.path, global.figlet, global.inquirer)));
})(this, (function (shelljs, chalk, fsExtra, axios, compressing, merge, crypto, ora, path, figlet, inquirer) { 'use strict';

	const DEPENDENCIES = 'dependencies';
	const DEV_DEPENDENCIES = 'devDependencies';
	const DEFAULT_EXCLUDE_MERGE_FILES = [
	    'nb-draggable',
	    'nb-math',
	    'nb-optiscroll',
	    'nb-request-sync',
	    'nb-vue-element',
	    'nb-vue-utils',
	    'nb-http-proxy'
	];

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
	const dfsCreateDir = (targetDir) => {
	    if (fsExtra.existsSync(targetDir)) {
	        return true;
	    }
	    else {
	        if (dfsCreateDir(path.dirname(targetDir))) {
	            fsExtra.mkdirSync(targetDir);
	            return true;
	        }
	    }
	};
	/**
	 * 终端标题打印
	 */
	function logTips(tips) {
	    console.log(chalk.green(figlet.textSync(tips, {
	        font: 'Ghost'
	    })));
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
	            type: 'list',
	            name: 'projectMode',
	            message: '请选择处理模式',
	            choices: [
	                {
	                    name: '移动node_modules下nb文件到工程目录',
	                    value: 'move'
	                },
	                {
	                    name: '下载nb文件到工程目录',
	                    value: 'download'
	                }
	            ]
	        },
	        {
	            type: 'confirm',
	            name: 'pkgCover',
	            message: `是否覆盖当前${chalk.blue('package.json')}`
	        }
	    ];
	    return inquirer.prompt(questions);
	}
	async function oraTips(cb, option = {
	    //   text: "loading...",
	    prefixText: '处理中',
	    color: 'yellow',
	    spinner: {
	        interval: 80,
	        frames: ['-', '+', '-']
	    },
	    hideCursor: true
	}) {
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
	    const devDependenciesCount = fsExtra.readdirSync(getModulesDEVRootDir()).length;
	    const allCount = dependenciesCount + devDependenciesCount;
	    console.log('🐛💐🎉👏👏🎉💐🐛');
	    console.log(`共处理模块：${chalk.blue.bold(allCount)} 个，其中${chalk.green.bold(' dependencies ')}模块 ${chalk.red.bold(dependenciesCount)} 个，${chalk.green.bold(' devDependencies ')}模块 ${chalk.red.bold(devDependenciesCount)} 个`);
	    console.log(`批处理脚本总耗时：${chalk.yellow.bold(endTime - startTime)} 毫秒`);
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
	    await fsExtra.writeFile(`${getRootDir()}/package.json`, JSON.stringify(packageJSON, null, 2));
	    console.log(chalk.red.bold('package.json整理完成'));
	}
	async function run(tips = 'nb batch script', excludeMergeFiles = DEFAULT_EXCLUDE_MERGE_FILES) {
	    logTips(tips);
	    await askQuetions();
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
	        return;
	    });
	}

	return run;

}));
