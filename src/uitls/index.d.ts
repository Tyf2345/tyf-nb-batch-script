import ora from 'ora';
import { TNbDependciesType } from 'src/types';
export declare function getLastDirName(dir: string): void;
export declare function random(): `${string}-${string}-${string}-${string}-${string}`;
/**
 *
 * @returns 项目更目录 全路径
 */
export declare function getRootDir(): string;
export declare function getPackageJSON(pkgPath: string): Record<string, any>;
export declare function getModulesRootDir(): string;
export declare function getModulesDEVRootDir(): string;
export declare function getAllModuleName(): string[];
export declare function getAllModuleInfo(): IAllModuleInfo[];
declare const _dfsCreateDir: (targetDir: string) => boolean;
export { _dfsCreateDir as dfsCreateDir };
export declare function setWebpackAlias(dirList: string[], type: TNbDependciesType): string;
export declare function handleNodeModulesReplace(path: string): string;
/**
 * 终端标题打印
 */
export declare function logTips(): void;
/**
 * 终端cli 选项
 * @returns inquirer
 */
export declare function askQuetions(): any;
export declare function oraTips(cb: {
    (): Promise<void>;
    (...args: (() => void)[]): Promise<void>;
}, option?: ora.Options): Promise<void>;
/**
 * 打印模块信息（模块数、耗时）
 * @param {*} cb
 */
export declare function printInfoWrap(cb: {
    (): Promise<void>;
    (...args: (() => void)[]): Promise<void>;
}): Promise<void>;
