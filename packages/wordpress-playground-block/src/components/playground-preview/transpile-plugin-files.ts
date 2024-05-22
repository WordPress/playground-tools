import type { EditorFile } from '../../index';

let esbuild: Promise<typeof import('esbuild-wasm')> | undefined = undefined;
let esbuildInitialized: any = undefined;

export const transpilePluginFiles = async (
	files: EditorFile[]
): Promise<EditorFile[]> => {
	if (esbuild === undefined) {
		esbuild = import('esbuild-wasm');
		esbuildInitialized = (await esbuild)!.initialize({
			worker: true,
			wasmURL: 'https://unpkg.com/esbuild-wasm@0.21.3/esbuild.wasm',
		});
	}

	const transpiled = files.map(async (file) => {
		if (file.name === 'block.json') {
			return [
				{
					name: 'block.json.esmodule.js',
					contents: `export default ${file.contents}`,
				},
			];
		}
		// Don't transpile .js files
		if (!file.name.endsWith('.js')) {
			return file;
		}
		await esbuildInitialized;
		try {
			const transpiled = await (
				await esbuild!
			).transform(file.contents, {
				loader: 'jsx',
				target: 'esnext',
				jsxFactory: 'wp.element.createElement',
				format: 'esm',
			});
			return [
				{
					name: file.name + '.src',
					contents: file.contents,
				},
				{
					name: file.name,
					contents: transpiled.code,
				},
			];
		} catch {
			// Default to an untranspiled file
			return [file];
		}
	});
	// Flatten the array
	return (await Promise.all(transpiled)).flatMap((x) => x);
};
