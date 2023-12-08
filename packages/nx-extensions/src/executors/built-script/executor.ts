import { BuiltScriptExecutorSchema } from './schema';
import { spawnSync } from 'child_process';
import { join } from 'path';

// Weird, this is supposed to be a module, but it's not.
const dirname = __dirname;

export default async function runExecutor(options: BuiltScriptExecutorSchema) {
	const args = [
		...(options['inspect'] ? ['--inspect-brk'] : []),
		...(options['inspect-brk'] ? ['--inspect-brk'] : []),
		...(options['trace-exit'] ? ['--trace-exit'] : []),
		...(options['trace-uncaught'] ? ['--trace-uncaught'] : []),
		...(options['trace-warnings'] ? ['--trace-warnings'] : []),
		'--loader',
		join(dirname, 'loader.mjs'),
		options.scriptPath,
		...(options.__unparsed__ || []),
	];
	const result = spawnSync('node', args, {
		stdio: 'inherit',
	});
	return {
		success: result.status === 0,
	};
}
