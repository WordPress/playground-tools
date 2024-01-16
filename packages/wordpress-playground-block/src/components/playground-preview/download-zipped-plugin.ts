import { PlaygroundClient, phpVar } from '@wp-playground/client';

export default async function downloadZippedPlugin(client: PlaygroundClient) {
	const docroot = await client.documentRoot;
	const pluginPath = docroot + '/wp-content/plugins/demo-plugin';
	const zipFile = new File(
		[await zipPlaygroundFiles(client, pluginPath)],
		'wordpress-playground-plugin.zip',
		{
			type: 'application/zip',
		}
	);

	downloadFile(zipFile);
}

/**
 * @TODO migrate to @wp-playground/compression-streams
 */
async function zipPlaygroundFiles(client: PlaygroundClient, path: string) {
	const zipPath = '/tmp/archive.zip';

	const result = await client.run({
		code: `<?php
				if(file_exists(${phpVar(zipPath)})) {
					unlink(${phpVar(zipPath)});
				}
				$zip = new ZipArchive;
				$zip->open(${phpVar(zipPath)}, ZipArchive::CREATE | ZipArchive::OVERWRITE);
				$files = new RecursiveIteratorIterator(
					new RecursiveDirectoryIterator(${phpVar(path)}),
					RecursiveIteratorIterator::LEAVES_ONLY
				);

				foreach ($files as $name => $file) {
					if (!$file->isDir()) {
						$filePath = $file->getRealPath();
						$relativePath = substr($filePath, ${path.length} + 1);

						$zip->addFile($filePath, $relativePath);
					}
				}

				$zip->close();
				echo 'done';
			`,
	});
	if (result.text !== 'done') {
		console.log('Error creating zip file');
		console.log(result.errors);
		console.log(result.text);
	}

	return await client.readFileAsBuffer(zipPath);
}

export function downloadFile(blob: Blob) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = blob.name;
	link.click();
}
