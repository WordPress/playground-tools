<?php
function collector_iterate_directory($path, $prefix, $callback)
{
	$handle = opendir($path);

	while($entry = readdir($handle))
	{
		if($entry === '.' || $entry === '..' || substr($entry, 0, 1) === '.')
		{
			continue;
		}

		$realPath = path_join($path, $entry);
		$packPath = substr($realPath, strlen($prefix));

		$callback($realPath, $packPath);
	}
}
