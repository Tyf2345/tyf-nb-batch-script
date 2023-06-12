import { randomUUID } from 'crypto';
import { existsSync, readFileSync, readdirSync, mkdirSync } from 'fs-extra';
import ora from 'ora';
import { red, green, blue, yellow } from 'chalk';
import { dirname } from 'path';
import { textSync } from 'figlet';
import inquirer from 'inquirer';
import {
	DEPENDENCIES,
	DEV_DEPENDENCIES,
	NODE_MODULES
} from '../constants/index';
import { IAllModuleInfo, TNbDependciesType } from 'src/types';

export function getLastDirName(dir: string) {
	dir.split('/').at(-1);
}

export function random() {
	return randomUUID();
}

/**
 *
 * @returns 项目更目录 全路径
 */
export function getRootDir() {
	return process.cwd();
}

export function getPackageJSON(pkgPath: string) {
	const path = `${pkgPath}/package.json`;
	const pkgStatus = existsSync(path);
	if (!pkgStatus) {
		throw new Error(red(`路径${path}不存在`));
	}
	const str = readFileSync(path, { encoding: 'utf-8' }).toString();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return JSON.parse(str) as Record<string, any>;
}

export function getModulesRootDir() {
	const path = `${getRootDir()}/src/center-modules/${DEPENDENCIES}`;
	if (!existsSync(path)) {
		dfsCreateDir(path);
	}
	return path;
}
export function getModulesDEVRootDir() {
	const path = `${getRootDir()}/src/center-modules/${DEV_DEPENDENCIES}`;
	if (!existsSync(path)) {
		dfsCreateDir(path);
	}
	return path;
}

// 获取所有模块名
export function getAllModuleName() {
	return [
		...readdirSync(getModulesRootDir()),
		...readdirSync(getModulesDEVRootDir())
	];
}

// 获取所有模块信息
export function getAllModuleInfo() {
	return [
		...readdirSync(getModulesRootDir()).map((fileName) => ({
			fileName,
			relativeUrl: `src/center-modules/${DEPENDENCIES}`,
			type: DEPENDENCIES
		})),
		...readdirSync(getModulesDEVRootDir()).map((fileName) => ({
			fileName,
			relativeUrl: `src/center-modules/${DEV_DEPENDENCIES}`,
			type: DEV_DEPENDENCIES
		}))
	] as IAllModuleInfo[];
}

const dfsCreateDir = (targetDir: string) => {
	if (existsSync(targetDir)) {
		return true;
	} else {
		if (dfsCreateDir(dirname(targetDir))) {
			mkdirSync(targetDir);
			return true;
		}
	}
};
const _dfsCreateDir = dfsCreateDir;
export { _dfsCreateDir as dfsCreateDir };

export function setWebpackAlias(dirList: string[], type: TNbDependciesType) {
	let str = '';
	dirList.forEach((dirName) => {
		str += `
            '${dirName}': utils.resolve('src/center-modules/${type}/${dirName}'),`;
	});
	return str;
}

export function handleNodeModulesReplace(path: string) {
	let webpackStr = readFileSync(path, { encoding: 'utf-8' }).toString();
	const webpackList = webpackStr.split(`${NODE_MODULES}/`);
	const allModuleInfo = getAllModuleInfo();
	for (let i = 0; i < webpackList.length; i++) {
		let flag = false;
		for (let j = 0; j < allModuleInfo.length; j++) {
			if (
				webpackList[i].includes(allModuleInfo[j].fileName) &&
				!webpackList[i].includes(allModuleInfo[j].fileName + '-')
			) {
				webpackList[i] = `${allModuleInfo[j].relativeUrl}/${webpackList[i]}`;
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
export function logTips() {
	console.log(
		green(
			textSync('nb batch script', {
				font: 'Ghost'
			})
		)
	);
}

/**
 * 终端cli 选项
 * @returns inquirer
 */
export function askQuetions() {
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
			message: `是否覆盖当前${blue('package.json')}`
		}
	];
	return inquirer.prompt(questions);
}

export async function oraTips(
	cb: {
		(): Promise<void>;
		(...args: (() => void)[]): Promise<void>;
	},
	option: ora.Options = {
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
export async function printInfoWrap(cb: {
	(): Promise<void>;
	(...args: (() => void)[]): Promise<void>;
}) {
	const startTime = Date.now();
	await oraTips(cb);
	const endTime = Date.now();
	const dependenciesCount = readdirSync(getModulesRootDir()).length;
	const devDependenciesCount = readdirSync(getModulesDEVRootDir()).length;
	const allCount = dependenciesCount + devDependenciesCount;
	console.log('🐛💐🎉👏👏🎉💐🐛');
	console.log(
		`共处理模块：${blue.bold(allCount)} 个，其中${green.bold(
			' dependencies '
		)}模块 ${red.bold(dependenciesCount)} 个，${green.bold(
			' devDependencies '
		)}模块 ${red.bold(devDependenciesCount)} 个`
	);
	console.log(`批处理脚本总耗时：${yellow.bold(endTime - startTime)} 毫秒`);
}
