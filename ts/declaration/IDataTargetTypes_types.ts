declare class ExAddTargetSFInputT {
	url: string;
	constructor(args?: {
		url?: string,
	});
}
declare class ExAddTargetUDFInputT {
	url: string;
	appName: string;
	constructor(args?: {
		url?: string,
		appName?: string,
	});
}
declare class ExAddTargetSpecificInputT {
	sfInput: ExAddTargetSFInputT;
	udfInput: ExAddTargetUDFInputT;
	constructor(args?: {
		sfInput?: ExAddTargetSFInputT,
		udfInput?: ExAddTargetUDFInputT,
	});
}
declare class ExExportTargetHdrT {
	type: number;
	name: string;
	constructor(args?: {
		type?: number,
		name?: string,
	});
}
declare class ExExportTargetT {
	hdr: ExExportTargetHdrT;
	specificInput: ExAddTargetSpecificInputT;
	constructor(args?: {
		hdr?: ExExportTargetHdrT,
		specificInput?: ExAddTargetSpecificInputT,
	});
}
declare class ExInitExportCSVArgsT {
	fieldDelim: string;
	recordDelim: string;
	quoteDelim: string;
	constructor(args?: {
		fieldDelim?: string,
		recordDelim?: string,
		quoteDelim?: string,
	});
}
declare class ExInitExportJSONArgsT {
	array: boolean;
	constructor(args?: {
		array?: boolean,
	});
}
declare class ExInitExportSQLArgsT {
	tableName: string;
	dropTable: boolean;
	createTable: boolean;
	constructor(args?: {
		tableName?: string,
		dropTable?: boolean,
		createTable?: boolean,
	});
}
declare class ExInitExportFormatSpecificArgsT {
	csv: ExInitExportCSVArgsT;
	json: ExInitExportJSONArgsT;
	sql: ExInitExportSQLArgsT;
	constructor(args?: {
		csv?: ExInitExportCSVArgsT,
		json?: ExInitExportJSONArgsT,
		sql?: ExInitExportSQLArgsT,
	});
}
declare class ExSFFileSplitSpecificT {
	numFiles: number;
	maxSize: number;
	constructor(args?: {
		numFiles?: number,
		maxSize?: number,
	});
}
declare class ExSFFileSplitRuleT {
	type: number;
	spec: ExSFFileSplitSpecificT;
	constructor(args?: {
		type?: number,
		spec?: ExSFFileSplitSpecificT,
	});
}
declare class ExInitExportSFInputT {
	fileName: string;
	format: number;
	splitRule: ExSFFileSplitRuleT;
	headerType: number;
	formatArgs: ExInitExportFormatSpecificArgsT;
	constructor(args?: {
		fileName?: string,
		format?: number,
		splitRule?: ExSFFileSplitRuleT,
		headerType?: number,
		formatArgs?: ExInitExportFormatSpecificArgsT,
	});
}
declare class ExInitExportUDFInputT {
	fileName: string;
	format: number;
	headerType: number;
	formatArgs: ExInitExportFormatSpecificArgsT;
	constructor(args?: {
		fileName?: string,
		format?: number,
		headerType?: number,
		formatArgs?: ExInitExportFormatSpecificArgsT,
	});
}
declare class ExInitExportSpecificInputT {
	sfInput: ExInitExportSFInputT;
	udfInput: ExInitExportUDFInputT;
	constructor(args?: {
		sfInput?: ExInitExportSFInputT,
		udfInput?: ExInitExportUDFInputT,
	});
}
declare class ExColumnNameT {
	columnName: string;
	headerName: string;
	constructor(args?: {
		columnName?: string,
		headerName?: string,
	});
}
declare class ExExportMetaT {
	target: ExExportTargetHdrT;
	specificInput: ExInitExportSpecificInputT;
	createRule: number;
	sorted: boolean;
	numColumns: number;
	columns: ExColumnNameT[];
	constructor(args?: {
		target?: ExExportTargetHdrT,
		specificInput?: ExInitExportSpecificInputT,
		createRule?: number,
		sorted?: boolean,
		numColumns?: number,
		columns?: ExColumnNameT[],
	});
}
