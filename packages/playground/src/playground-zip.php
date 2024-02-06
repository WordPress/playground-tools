<?php

defined('ABSPATH') || exit;

require __DIR__ . '/playground-db.php';

use ZipStream\ZipStream;
use ZipStream\Option\Archive;

function playground_zip_wp_content($zip)
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

		$zip->addFileFromPath(
			str_replace($root_dir, '/wp-content', $file),
			$file
		);
	}
}

function playground_zip_collect()
{
	$options = new Archive();
	$options->setSendHttpHeaders(true);
	$zip = new ZipStream(
		'playground-package-' . date('Y-m-d_H-i-s') . '.zip',
		$options
	);

	playground_zip_wp_content($zip);
	playground_dump_db($zip);

	$zip->finish();
}
