<?php

namespace WordPress\Playground;

defined('ABSPATH') || exit;

require __DIR__ . '/playground-db.php';

use ZipStream\ZipStream;

/**
 * Add the wp-content directory to a zip archive.
 *
 * @param ZipStream $zip The zip archive to add the wp-content directory to.
 */
function zip_wp_content($zip)
{
	$root_dir = WP_CONTENT_DIR;
	$directory = new \RecursiveDirectoryIterator($root_dir, \FilesystemIterator::FOLLOW_SYMLINKS);
	$iterator = new \RecursiveIteratorIterator($directory);
	// @TODO - Allow a whitelist of files to be included like .htaccess and .ht.sqlite
	// Exclude hidden files and directories (i.e. .git, .github, .gitignore), and parent directory (i.e. ..)
	$regex = new \RegexIterator($iterator, '/^(?!.*\/\..*)^.+$/i', \RecursiveRegexIterator::GET_MATCH);
	foreach ($regex as $file) {
		if (empty($file)) {
			continue;
		}
		$file = $file[0];

		if (is_dir($file)) {
			continue;
		}

		$file = apply_filters('playground_exported_file', $file);
		if (false === $file) {
			continue;
		}
		$zip->addFileFromPath(
			str_replace($root_dir, '/wp-content', $file),
			$file
		);
	}
}

/**
 * Collect the wp-content directory and database dump, add them to a zip archive and send it to the browser.
 */
function zip_collect()
{
	$zip = new ZipStream(
		outputName: 'playground-package-' . gmdate('Y-m-d_H-i-s') . '.zip',
		sendHttpHeaders: true
	);

	zip_wp_content($zip);
	zip_database($zip);

	$zip->finish();
}
