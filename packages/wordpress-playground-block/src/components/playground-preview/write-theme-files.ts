import type { EditorFile } from '../../index';
import {
	PlaygroundClient,
	activateTheme,
	// @ts-ignore
} from 'https://playground.wordpress.net/client/index.js';

export const writeThemeFiles = async (
	client: PlaygroundClient,
	files: EditorFile[]
) => {
	const docroot = await client.documentRoot;
	const themeFolderName = 'demo-theme';
	console.log('themeSlug', themeFolderName);

	const themePath = docroot + '/wp-content/themes/' + themeFolderName;
	if (await client.fileExists(themePath)) {
		await client.rmdir(themePath, {
			recursive: true,
		});
	}
	await client.mkdir(themePath);

	for (const file of files) {
		const filePath = `${themePath}/${file.name}`;
		const parentDir = filePath.split('/').slice(0, -1).join('/');
		await client.mkdir(parentDir);
		await client.writeFile(filePath, file.contents);
	}

	try {
		await activateTheme(client, {
			themeFolderName,
		});
	} catch (e) {
		console.error(e);
	}
};
