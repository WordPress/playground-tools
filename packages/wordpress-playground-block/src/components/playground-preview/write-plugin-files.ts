import type { EditorFile } from '../../index';
import { PlaygroundClient } from '@wp-playground/client';
import { activatePlugin } from '@wp-playground/blueprints';

export const writePluginFiles = async (
	client: PlaygroundClient,
	files: EditorFile[]
) => {
	const docroot = await client.documentRoot;
	const pluginPath = docroot + '/wp-content/plugins/demo-plugin';
	if (await client.fileExists(pluginPath)) {
		await client.rmdir(pluginPath, {
			recursive: true,
		});
	}
	await client.mkdir(pluginPath);

	for (const file of files) {
		const filePath = `${pluginPath}/${file.name}`;
		const parentDir = filePath.split('/').slice(0, -1).join('/');
		await client.mkdir(parentDir);
		await client.writeFile(filePath, file.contents);
	}

	try {
		await activatePlugin(client, {
			pluginPath,
		});
	} catch (e) {
		console.error(e);
	}
};
