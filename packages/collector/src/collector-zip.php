<?php

defined('ABSPATH') || exit;

use ZipStream\ZipStream;
use ZipStream\Option\Archive;


function collector_zip_wp_content($zip)
{
	$callback = function ($realPath, $packPath) use ($zip, &$callback) {
		if (is_file($realPath)) {
			$zip->addFileFromPath($packPath, $realPath);
		} else if (is_dir($realPath)) {
			collector_iterate_directory($realPath, ABSPATH, $callback);
		}
	};

	collector_iterate_directory(ABSPATH . '/wp-content/', ABSPATH, $callback);
}

function collector_open_zip()
{
	$options = new Archive();
	$options->setSendHttpHeaders(true);
	$zip = new ZipStream(
		'collector-package-' . date('Y-m-d_H-i-s') . '.zip',
		$options
	);
	return $zip;
}

function collector_close_zip($zip)
{
	$zip->finish();
}

function collector_zip_collect()
{
	$zip = collector_open_zip();
	collector_zip_wp_content($zip);
	collector_dump_db($zip);
	collector_close_zip($zip);
}
