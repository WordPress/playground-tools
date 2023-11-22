<?php
function collector_iterate_directory($path, $prefix, $callback)
{
	$handle = opendir($path);

	while($entry = readdir($handle))
	{
		if($entry === '.' || $entry === '..' || substr($entry, 0, 4) === '.git' || substr($entry, 0, 4) === '.svn' || substr($entry, 0, 10) === '.mercurial')
		{
			continue;
		}

		$realPath = realpath($path . '/' . $entry);
		$packPath = substr($realPath, strlen($prefix));

		$callback($realPath, $packPath);
	}
}
