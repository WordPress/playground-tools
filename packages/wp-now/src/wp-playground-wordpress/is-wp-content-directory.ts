import fs from 'fs-extra';
import path from 'path';
import { hasPluginOrThemeDirectory } from './has-plugin-or-theme-directory';

/**
 * Checks if the given path is a WordPress wp-content directory.
 *
 * @param projectPath The path to the project to check.
 * @returns A boolean value indicating whether the project is a WordPress wp-content directory.
 */
export function isWpContentDirectory(projectPath: string): Boolean {
	// Check the immediate directory first.
	if (hasPluginOrThemeDirectory(projectPath)){
		return true;
	}
	if (fs.existsSync(path.join(projectPath, 'wp-content'))) {
		return hasPluginOrThemeDirectory(path.join(projectPath, 'wp-content'));
	}
	return false;
}
