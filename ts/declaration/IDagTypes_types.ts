declare class XcalarApiNamedInputT {
	isTable: boolean;
	name: string;
	nodeId: string;
	constructor(args?: {
		isTable?: boolean,
		name?: string,
		nodeId?: string,
	});
}
declare class DagRefT {
	type: number;
	name: string;
	xid: string;
	constructor(args?: {
		type?: number,
		name?: string,
		xid?: string,
	});
}
