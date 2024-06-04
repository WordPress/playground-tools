<?php

namespace WordPress\Playground;
use WordPress\Zip\ZipStreamWriter;

defined('ABSPATH') || exit;

require __DIR__ . '/playground-db.php';

require_once __DIR__ . '/../vendor/WordPress/Zip/autoload.php';

/**
 * Add the wp-content directory to a zip archive.
 *
 * @param ZipStreamWriter $zip The zip archive to add the wp-content directory to.
 */
function zip_wp_content(ZipStreamWriter $writer)
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
		$writer->writeFileFromPath(
			str_replace($root_dir, 'wp-content', $file),
			$file,
		);
	}
}

/**
 * Collect the wp-content directory and database dump, add them to a zip archive and send it to the browser.
 */
function zip_collect()
{
	$filename = 'playground-package-' . gmdate('Y-m-d_H-i-s') . '.zip';
	header('Content-Type: application/zip');
	header('Content-Disposition: attachment; filename="' . $filename . '"');
	header('Pragma: public');
	header('Cache-Control: public, must-revalidate');
	header('Content-Transfer-Encoding: binary');

	$fp = fopen('php://output', 'wb');
	$writer = new \WordPress\Zip\ZipStreamWriter($fp);

	zip_wp_content($writer);
	zip_database($writer);

	$writer->finish();
	fclose($fp);
	die();
}
