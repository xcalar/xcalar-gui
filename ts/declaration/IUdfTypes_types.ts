declare class UdfModuleSrcT {
	type: number;
	moduleName: string;
	sourceSize: number;
	source: string;
	constructor(args?: {
		type?: number,
		moduleName?: string,
		sourceSize?: number,
		source?: string,
	});
}

declare enum UdfTypeT {
	UdfTypePython,
};