<?php

defined('ABSPATH') || exit;

require __DIR__ . '/collector-db.php';

use ZipStream\ZipStream;
use ZipStream\Option\Archive;

function collector_zip_wp_content($zip)
{
	$root_dir = WP_CONTENT_DIR;
	$directory = new \RecursiveDirectoryIterator($root_dir, \FilesystemIterator::FOLLOW_SYMLINKS);
	$iterator = new \RecursiveIteratorIterator($directory);
	$regex = new \RegexIterator($iterator, '/^.+\/(?!.*\.\.).+$/i', \RecursiveRegexIterator::GET_MATCH);
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

function collector_zip_collect()
{
	$options = new Archive();
	$options->setSendHttpHeaders(true);
	$zip = new ZipStream(
		'collector-package-' . date('Y-m-d_H-i-s') . '.zip',
		$options
	);

	collector_zip_wp_content($zip);
	collector_dump_db($zip);

	$zip->finish();
}
