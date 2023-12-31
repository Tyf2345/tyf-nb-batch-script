import { DEPENDENCIES, DEV_DEPENDENCIES } from 'src/constants';
export type TProjectType = 'js' | 'ts';
export type TProjectMode = 'move' | 'download';

export type TNbDependciesType = typeof DEPENDENCIES | typeof DEV_DEPENDENCIES;
export interface INbDependciesFileName {
	fileName: string;
	url: string;
}

export interface INbDependciesFileNameAndType extends INbDependciesFileName {
	type: TNbDependciesType;
}

export interface IAllModuleInfo extends INbDependciesFileNameAndType {
	relativeUrl: string;
}
