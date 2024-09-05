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
	const themeSlug = 'demo-theme';
	console.log('themeSlug', themeSlug);

	const themePath = docroot + '/wp-content/themes/' + themeSlug;
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
			themeSlug,
		});
	} catch (e) {
		console.error(e);
	}
};
