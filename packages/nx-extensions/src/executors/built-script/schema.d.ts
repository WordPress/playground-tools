export interface BuiltScriptExecutorSchema {
	scriptPath: string;
	inspect: boolean;
	'inspect-brk': boolean;
	'trace-exit': boolean;
	'trace-uncaught': boolean;
	'trace-warnings': boolean;
	__unparsed__: string;
} // eslint-disable-line
