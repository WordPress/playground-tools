import fs from 'fs-extra';
import path from 'path';

/**
 * Detects whether the directory has plugin or theme directories.
 *
 * @param projectPath The path to the project to check.
 * @returns A boolean value indicating whether the directory has plugin or theme directories.
 */
export function hasPluginOrThemeDirectory(projectPath: string): Boolean {
	const checkDirs = ['mu-plugins', 'plugins', 'themes'];
	let dirExists = false;
	checkDirs.forEach((dir) => {
		if (!dirExists && fs.existsSync(path.join(projectPath, dir))) {
			dirExists = true;
		}
	});
	return dirExists;
}
