<?php

namespace WordPress\Zip;

class ZipStreamReader {

	const SIGNATURE_FILE                  = 0x04034b50;
	const SIGNATURE_CENTRAL_DIRECTORY     = 0x02014b50;
	const SIGNATURE_CENTRAL_DIRECTORY_END = 0x06054b50;
	const COMPRESSION_DEFLATE             = 8;

	/**
	 * Reads the next zip entry from a stream of zip file bytes.
	 *
	 * @param resource $fp A stream of zip file bytes.
	 */
	public static function readEntry( $fp ) {
		$signature = static::read_bytes( $fp, 4 );
		if ( $signature === false ) {
			return null;
		}
		$signature = unpack( 'V', $signature )[1];
		if ( $signature === static::SIGNATURE_FILE ) {
			return static::readFileEntry( $fp );
		} elseif ( $signature === static::SIGNATURE_CENTRAL_DIRECTORY ) {
			return static::readCentralDirectoryEntry( $fp, true );
		} elseif ( $signature === static::SIGNATURE_CENTRAL_DIRECTORY_END ) {
			return static::readEndCentralDirectoryEntry( $fp, true );
		}

		return null;
	}


	/**
	 * Reads a file entry from a zip file.
	 *
	 * The file entry is structured as follows:
	 *
	 * ```
	 * Offset    Bytes    Description
	 *   0        4    Local file header signature = 0x04034b50 (PK♥♦ or "PK\3\4")
	 *   4        2    Version needed to extract (minimum)
	 *   6        2    General purpose bit flag
	 *   8        2    Compression method; e.g. none = 0, DEFLATE = 8 (or "\0x08\0x00")
	 *   10        2    File last modification time
	 *   12        2    File last modification date
	 *   14        4    CRC-32 of uncompressed data
	 *   18        4    Compressed size (or 0xffffffff for ZIP64)
	 *   22        4    Uncompressed size (or 0xffffffff for ZIP64)
	 *   26        2    File name length (n)
	 *   28        2    Extra field length (m)
	 *   30        n    File name
	 *   30+n    m    Extra field
	 * ```
	 *
	 * @param resource $stream
	 */
	protected static function readFileEntry( $stream ): ZipFileEntry {
		$data  = self::read_bytes( $stream, 26 );
		$data  = unpack(
			'vversionNeeded/vgeneralPurpose/vcompressionMethod/vlastModifiedTime/vlastModifiedDate/Vcrc/VcompressedSize/VuncompressedSize/vpathLength/vextraLength',
			$data
		);
		$path  = self::read_bytes( $stream, $data['pathLength'] );
		$extra = self::read_bytes( $stream, $data['extraLength'] );
		$bytes = self::read_bytes( $stream, $data['compressedSize'] );

		if ( $data['compressionMethod'] === static::COMPRESSION_DEFLATE ) {
			try {
				$bytes = gzinflate( $bytes );
			} catch ( \Throwable $e ) {
				// Ignore the error
			}
		}

		return new ZipFileEntry(
			$data['versionNeeded'],
			$data['generalPurpose'],
			$data['compressionMethod'],
			$data['lastModifiedTime'],
			$data['lastModifiedDate'],
			$data['crc'],
			$data['compressedSize'],
			$data['uncompressedSize'],
			$path,
			$extra,
			$bytes
		);
	}

	/**
	 * Reads a central directory entry from a zip file.
	 *
	 * The central directory entry is structured as follows:
	 *
	 * ```
	 * Offset Bytes Description
	 *   0        4    Central directory file header signature = 0x02014b50
	 *   4        2    Version made by
	 *   6        2    Version needed to extract (minimum)
	 *   8        2    General purpose bit flag
	 *   10        2    Compression method
	 *   12        2    File last modification time
	 *   14        2    File last modification date
	 *   16        4    CRC-32 of uncompressed data
	 *   20        4    Compressed size (or 0xffffffff for ZIP64)
	 *   24        4    Uncompressed size (or 0xffffffff for ZIP64)
	 *   28        2    File name length (n)
	 *   30        2    Extra field length (m)
	 *   32        2    File comment length (k)
	 *   34        2    Disk number where file starts (or 0xffff for ZIP64)
	 *   36        2    Internal file attributes
	 *   38        4    External file attributes
	 *   42        4    Relative offset of local file header (or 0xffffffff for ZIP64). This is the number of bytes between the start of the first disk on which the file occurs, and the start of the local file header. This allows software reading the central directory to locate the position of the file inside the ZIP file.
	 *   46        n    File name
	 *   46+n    m    Extra field
	 *   46+n+m    k    File comment
	 * ```
	 *
	 * @param resource stream
	 */
	protected static function readCentralDirectoryEntry( $stream ): ZipCentralDirectoryEntry {
		$data        = static::read_bytes( $stream, 42 );
		$data        = unpack(
			'vversionCreated/vversionNeeded/vgeneralPurpose/vcompressionMethod/vlastModifiedTime/vlastModifiedDate/Vcrc/VcompressedSize/VuncompressedSize/vpathLength/vextraLength/vfileCommentLength/vdiskNumber/vinternalAttributes/VexternalAttributes/VfirstByteAt',
			$data
		);
		$path        = static::read_bytes( $stream, $data['pathLength'] );
		$extra       = static::read_bytes( $stream, $data['extraLength'] );
		$fileComment = static::read_bytes( $stream, $data['fileCommentLength'] );

		return new ZipCentralDirectoryEntry(
			$data['versionCreated'],
			$data['versionNeeded'],
			$data['generalPurpose'],
			$data['compressionMethod'],
			$data['lastModifiedTime'],
			$data['lastModifiedDate'],
			$data['crc'],
			$data['compressedSize'],
			$data['uncompressedSize'],
			$data['diskNumber'],
			$data['internalAttributes'],
			$data['externalAttributes'],
			$data['firstByteAt'],
			$data['firstByteAt'] + 30 + $data['pathLength'] + $data['fileCommentLength'] + $data['extraLength'] + $data['compressionMethod'] - 1,
			$path,
			$extra,
			$fileComment
		);
	}

	/**
	 * Reads the end of central directory entry from a zip file.
	 *
	 * The end of central directory entry is structured as follows:
	 *
	 * ```
	 * Offset    Bytes    Description[33]
	 *   0         4        End of central directory signature = 0x06054b50
	 *   4         2        Number of this disk (or 0xffff for ZIP64)
	 *   6         2        Disk where central directory starts (or 0xffff for ZIP64)
	 *   8         2        Number of central directory records on this disk (or 0xffff for ZIP64)
	 *   10         2        Total number of central directory records (or 0xffff for ZIP64)
	 *   12         4        Size of central directory (bytes) (or 0xffffffff for ZIP64)
	 *   16         4        Offset of start of central directory, relative to start of archive (or 0xffffffff for ZIP64)
	 *   20         2        Comment length (n)
	 *   22         n        Comment
	 * ```
	 *
	 * @param resource $stream
	 */
	protected static function readEndCentralDirectoryEntry( $stream ): ZipEndCentralDirectoryEntry {
		$data = static::read_bytes( $stream, 18 );
		$data = unpack(
			'vdiskNumber/vcentralDirectoryStartDisk/vnumberCentralDirectoryRecordsOnThisDisk/vnumberCentralDirectoryRecords/VcentralDirectorySize/VcentralDirectoryOffset/vcommentLength',
			$data
		);

		return new ZipEndCentralDirectoryEntry(
			$data['diskNumber'],
			$data['centralDirectoryStartDisk'],
			$data['numberCentralDirectoryRecordsOnThisDisk'],
			$data['numberCentralDirectoryRecords'],
			$data['centralDirectorySize'],
			$data['centralDirectoryOffset'],
			static::read_bytes( $stream, $data['commentLength'] )
		);
	}

	/**
	 * Reads a fixed number of bytes from a stream.
	 * Unlike fread(), this function will block until enough bytes are available.
	 *
	 * @param $stream
	 * @param $length
	 *
	 * @return false|string
	 */
	protected static function read_bytes( $stream, $length ) {
		if ( $length === 0 ) {
			return '';
		}

		$data             = '';
		$remaining_length = $length;
		while ( $remaining_length > 0 ) {
			$chunk = fread( $stream, $remaining_length );
			if ( false === $chunk || ( '' === $chunk && feof( $stream ) ) ) {
				return strlen( $data ) ? $data : false;
			}
			$remaining_length -= strlen( $chunk );
			$data             .= $chunk;
		}

		return $data;
	}
}
