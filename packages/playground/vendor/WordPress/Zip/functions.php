<?php

namespace WordPress\Zip;

use Symfony\Component\Filesystem\Path;

function zip_read_entry( $fp ) {
	return ZipStreamReader::readEntry( $fp );
}

function zip_extract_to( $fp, $to_path ) {
	while ( $entry = zip_read_entry( $fp ) ) {
		if ( ! $entry->isFileEntry() ) {
			continue;
		}

		$path   = Path::canonicalize( $to_path . '/' . $entry->path );
		$parent = Path::getDirectory( $path );
		if ( ! is_dir( $parent ) ) {
			if(is_file($parent)) {
				unlink($parent);
			}
			mkdir( $parent, 0777, true );
		}

		if ( $entry->isDirectory ) {
			if ( ! is_dir( $path ) ) {
				mkdir( $path, 0777, true );
			}
		} else {
			file_put_contents( $path, $entry->bytes );
		}
	}

	return feof( $fp ) ? 1 : 0;
}
