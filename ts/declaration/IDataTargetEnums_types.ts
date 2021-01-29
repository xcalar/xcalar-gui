declare enum ExTargetTypeT {
  ExTargetUnknownType,
  ExTargetSFType,
  ExTargetUDFType
}

declare enum ExExportCreateRuleT {
  ExExportUnknownRule,
  ExExportCreateOnly,
  ExExportCreateOrAppend,
  ExExportAppendOnly,
  ExExportDeleteAndReplace
}

declare enum ExSFFileSplitTypeT {
  ExSFFileSplitUnknownType,
  ExSFFileSplitNone,
  ExSFFileSplitForceSingle,
  ExSFFileSplitSize
}

declare enum ExSFHeaderTypeT {
  ExSFHeaderUnknownType,
  ExSFHeaderEveryFile,
  ExSFHeaderSeparateFile,
  ExSFHeaderNone
}

declare const ExTargetTypeTStr: { [key: string]: string };
declare const ExTargetTypeTFromStr: { [key: string]: number };
declare const ExExportCreateRuleTStr: { [key: string]: string };
declare const ExExportCreateRuleTFromStr: { [key: string]: number };
declare const ExSFFileSplitTypeTStr: { [key: string]: string };
declare const ExSFFileSplitTypeTFromStr: { [key: string]: number };
declare const ExSFHeaderTypeTStr: { [key: string]: string };
declare const ExSFHeaderTypeTFromStr: { [key: string]: number };
