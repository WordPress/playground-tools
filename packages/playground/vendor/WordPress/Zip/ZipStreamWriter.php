<?php

namespace WordPress\Zip;

class ZipStreamWriter {

	const SIGNATURE_FILE                  = 0x04034b50;
	const SIGNATURE_CENTRAL_DIRECTORY     = 0x02014b50;
	const SIGNATURE_CENTRAL_DIRECTORY_END = 0x06054b50;
	const COMPRESSION_DEFLATE             = 8;
    const BUFFER_SIZE                     = 8192; // 8KB buffer size for streaming

	private $fp;
	private $centralDirectory = array();
	private $bytes_written = 0;

	public function __construct($output_stream)
	{
		$this->fp = $output_stream;
	}

	/**
	 * Streams a file from disk and writes it into a ZIP archive.
	 *
	 * This method reads the source file from the given path, computes necessary
	 * metadata (CRC32 checksum, uncompressed size, and compressed size using Deflate),
	 * and then writes the appropriate file entry header and data into the ZIP archive
	 * stream. The file data is read and compressed in two passes: first to compute 
	 * the CRC32 and sizes, and second to write the actual compressed data.
	 *
	 * @param string $sourcePathOnDisk The filesystem path to the source file to be included in the ZIP archive.
	 * @param string $targetPathInZip The desired path (including filename) of the file within the ZIP archive.
	 * @return number The number of bytes written to the ZIP archive stream.
	 *
	 * @note This function is designed to handle large files without loading them entirely
	 * into memory. It reads and compresses the file in chunks, making it suitable for streaming
	 * large files effectively.
	 */
	public function writeFileFromPath($targetPathInZip, $sourcePathOnDisk, $should_deflate = true) {
		$uncompressedSize = 0;
		$compressedSize = 0;
		if (!$should_deflate) {
			$uncompressedSize = filesize($sourcePathOnDisk);
			// Create the ZipFileEntry object
			$entry = new ZipFileEntry(
				2, // Version needed to extract (minimum)
				0, // General purpose bit flag
				0, // Compression method (0 = none)
				filemtime($sourcePathOnDisk) >> 16, // File last modification time
				filemtime($sourcePathOnDisk) & 0xFFFF, // File last modification date
				hexdec(hash_file('crc32b', $sourcePathOnDisk)), // CRC-32
				$uncompressedSize, // Uncompressed size
				$uncompressedSize, // Compressed size
				$targetPathInZip, // File name
				'', // Extra field
				''  // Not buffering bytes into memory
			);
	
			// Write the file entry header
			static::writeFileEntry($this->fp, $entry);
			$fileResource = fopen($sourcePathOnDisk, 'rb');
			stream_copy_to_stream($fileResource, $this->fp, $uncompressedSize);
			fclose($fileResource);
			$this->recordFileForCentralDirectory($entry);
			$this->bytes_written += $entry->size();
			return $entry->size();
		}

		// Open the source file for reading
		$fileResource = fopen($sourcePathOnDisk, 'rb');
		if (!$fileResource) {
			error_log("Could not open file: $sourcePathOnDisk");
			return -1;
		}
	
		// Initialize variables for first pass
		$hashContext = hash_init('crc32b');
		if( false === $hashContext ) {
			error_log("Failed to initialize hash context");
			fclose($fileResource);
			return -1;
		}

		$deflateContext = deflate_init(ZLIB_ENCODING_RAW);
		if(false === $deflateContext) {
			error_log("Failed to initialize deflate context");
			fclose($fileResource);
			return -1;
		}
	
		// First pass: Calculate the CRC32, uncompressed size, and compressed size
		while (!feof($fileResource)) {
			$buffer = fread($fileResource, self::BUFFER_SIZE);
			if( false === $buffer ) {
				error_log("Failed to read file");
				fclose($fileResource);
				return -1;
			}
			$uncompressedSize += strlen($buffer);
			hash_update($hashContext, $buffer);
			$compressedSize += strlen(deflate_add($deflateContext, $buffer, ZLIB_SYNC_FLUSH));
		}
	
		$compressedSize += strlen(deflate_add($deflateContext, '', ZLIB_FINISH));
		$crc = hexdec(hash_final($hashContext));
	
        // Create the ZipFileEntry object
        $entry = new ZipFileEntry(
			2, // Version needed to extract (minimum)
			0, // General purpose bit flag
			8, // Compression method (8 = deflate)
			filemtime($sourcePathOnDisk) >> 16, // File last modification time
			filemtime($sourcePathOnDisk) & 0xFFFF, // File last modification date
			$crc, // CRC-32
			$compressedSize, // Compressed size
			$uncompressedSize, // Uncompressed size
			$targetPathInZip, // File name
			'', // Extra field
			''  // Not buffering bytes into memory
		);

		// Write the file entry header
		static::writeFileEntry($this->fp, $entry);

		// Second pass: Stream write the compressed data
		if(false === rewind($fileResource)) {
			error_log("Failed to rewind file");
			fclose($fileResource);
			return -1;
		}

		$deflateContext = deflate_init(ZLIB_ENCODING_RAW);
		if(false === $deflateContext) {
			error_log("Failed to initialize deflate context");
			fclose($fileResource);
			return -1;
		}
		while (!feof($fileResource)) {
			$buffer = fread($fileResource, self::BUFFER_SIZE);
			if(false === $buffer) {
				error_log("Failed to read file");
				fclose($fileResource);
				return -1;
			}
			
			$compressedData = deflate_add($deflateContext, $buffer, ZLIB_SYNC_FLUSH);
			if( false === $compressedData ) {
				error_log("Failed to compress data");
				fclose($fileResource);
				return -1;
			}

			if(false === fwrite($this->fp, $compressedData)) {
				error_log("Failed to write compressed data");
				fclose($fileResource);
				return -1;
			}
		}

		$compressedData = deflate_add($deflateContext, '', ZLIB_FINISH);
		if( false === $compressedData ) {
			error_log("Failed to compress data");
			fclose($fileResource);
			return -1;
		}

		if(false === fwrite($this->fp, $compressedData)) {
			error_log("Failed to write compressed data");
			fclose($fileResource);
			return -1;
		}

		// Close the source file
		if(false === fclose($fileResource)) {
			error_log("Failed to close file");
			return -1;
		}

		$this->recordFileForCentralDirectory($entry);
		$this->bytes_written += $entry->size();
		return true;
	}

	public function writeFileFromString($targetPathInZip, $data, $should_deflate = true)
	{
		if ($should_deflate) {
			$compressed_data = gzdeflate($data);
		} else {
			$compressed_data = $data;
		}
	
		// Create the ZipFileEntry object
		$entry = new ZipFileEntry(
			2, // Version needed to extract (minimum)
			0, // General purpose bit flag
			$should_deflate ? 8 : 0, // Compression method (8 = deflate, 0 = none)
			time() >> 16, // File last modification time
			time() & 0xFFFF, // File last modification date
			hexdec(hash('crc32b', $data)), // CRC-32
			strlen($compressed_data), // Uncompressed size
			strlen($data), // Uncompressed size
			$targetPathInZip, // File name
			'', // Extra field
			$compressed_data  // Buffering bytes into memory
		);

		// Write the file entry header
		static::writeFileEntry($this->fp, $entry);
		$this->recordFileForCentralDirectory($entry);
		$this->bytes_written += $entry->size();
		return $entry->size();
	}

	private function recordFileForCentralDirectory(ZipFileEntry $file_entry) {
		$this->centralDirectory[] = new ZipCentralDirectoryEntry(
			2, // Version made by
			2, // Version needed to extract
			$file_entry->generalPurpose, // General purpose bit flag
			$file_entry->compressionMethod, // Compression method (none)
			$file_entry->lastModifiedTime, // File last modification time
			$file_entry->lastModifiedDate, // File last modification date
			$file_entry->crc, // CRC-32
			$file_entry->compressedSize, // Compressed size
			$file_entry->uncompressedSize, // Uncompressed size
			0, // Disk number where file starts
			0, // Internal file attributes
			0, // External file attributes
			$this->bytes_written, // First byte at
			$file_entry->path, // Path
			'', // Extra field
			''  // File comment
		);
	}

	public function finish()
	{
		$this->flushCentralDirectory();		
	}

    /**
     * Writes the central directory and its end record to the ZIP archive stream.
     *
     * This method writes all the central directory entries stored and then writes
     * the end of central directory record, finalizing the ZIP archive structure.
     */
    private function flushCentralDirectory() {
		$fp = $this->fp;
		$centralDirectoryOffset = $this->bytes_written;

        // Write all central directory entries
        foreach ($this->centralDirectory as $entry) {
            static::writeCentralDirectoryEntry($fp, $entry);
			$this->bytes_written += $entry->size();
        }

        // Create and write the end of central directory record
        $endEntry = new ZipEndCentralDirectoryEntry(
			0,									// $diskNumber
			0,									// $centralDirectoryStartDisk
			count($this->centralDirectory),		// $numberCentralDirectoryRecordsOnThisDisk
			count($this->centralDirectory),		// $numberCentralDirectoryRecords
			$this->bytes_written - $centralDirectoryOffset,	// $centralDirectorySize
			$centralDirectoryOffset,			// $centralDirectoryOffset
			''									// $comment
        );

        static::writeEndCentralDirectoryEntry($fp, $endEntry);
    }


	/**
	 * Writes the next zip entry from a stream of zip file bytes.
	 *
	 * @param resource $fp A stream of zip file bytes.
	 */
	public static function writeEntry( $fp, $entry ) {
		if ( $entry instanceof ZipFileEntry ) {
			return static::writeFileEntry( $fp, $entry );
		} else if ( $entry instanceof ZipCentralDirectoryEntry ) {
			return static::writeCentralDirectoryEntry( $fp, $entry );
		} elseif ( $entry instanceof ZipEndCentralDirectoryEntry ) {
			return static::writeEndCentralDirectoryEntry( $fp, $entry );
		}

		return null;
	}

	/**
	 * Writes a file entry to a zip file.
	 * The API consumer may leave $entry->bytes empty to write the bytes
	 * to the stream separately.
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
	protected static function writeFileEntry( $stream, ZipFileEntry $entry ) {
		$data = pack(
			'VvvvvvVVVvv',
			self::SIGNATURE_FILE,                        // Local file header signature
			$entry->version,                             // Version needed to extract
			$entry->generalPurpose,                      // General purpose bit flag
			$entry->compressionMethod,                   // Compression method
			$entry->lastModifiedTime,                    // File last modification time
			$entry->lastModifiedDate,                    // File last modification date
			$entry->crc,                                 // CRC-32
			$entry->compressedSize,                      // Compressed size
			$entry->uncompressedSize,                    // Uncompressed size
			strlen($entry->path),                        // File name length
			strlen($entry->extra)                        // Extra field length
		) . $entry->path . $entry->extra . $entry->bytes;

		return fwrite($stream, $data);
	}

	/**
	 * Writes a central directory entry to a zip file.
	 *
	 * The central directory entry is structured as follows:
	 *
	 * ```
	 * Offset Bytes Description
	 *   0        4    Central directory file header signature = 0x02014b50
	 *   4        2    Version made by
	 *   6        2    Version needed to extract (minimum)
	 *   8        2    General purpose bit flag
	 *   10       2    Compression method
	 *   12       2    File last modification time
	 *   14       2    File last modification date
	 *   16       4    CRC-32 of uncompressed data
	 *   20       4    Compressed size (or 0xffffffff for ZIP64)
	 *   24       4    Uncompressed size (or 0xffffffff for ZIP64)
	 *   28       2    File name length (n)
	 *   30       2    Extra field length (m)
	 *   32       2    File comment length (k)
	 *   34       2    Disk number where file starts (or 0xffff for ZIP64)
	 *   36       2    Internal file attributes
	 *   38       4    External file attributes
	 *   42       4    Relative offset of local file header (or 0xffffffff for ZIP64). This is the number of bytes between the start of the first disk on which the file occurs, and the start of the local file header. This allows software reading the central directory to locate the position of the file inside the ZIP file.
	 *   46       n    File name
	 *   46+n     m    Extra field
	 *   46+n+m   k    File comment
	 * ```
	 *
	 * @param resource stream
	 */
	protected static function writeCentralDirectoryEntry( $stream, ZipCentralDirectoryEntry $entry ) {
		$data = pack(
			'VvvvvvvVVVvvvvvVV',
			self::SIGNATURE_CENTRAL_DIRECTORY,           // Central directory file header signature
			$entry->versionCreated,                      // Version made by
			$entry->versionNeeded,                       // Version needed to extract
			$entry->generalPurpose,                      // General purpose bit flag
			$entry->compressionMethod,                   // Compression method
			$entry->lastModifiedTime,                    // File last modification time
			$entry->lastModifiedDate,                    // File last modification date
			$entry->crc,                                 // CRC-32
			$entry->compressedSize,                      // Compressed size
			$entry->uncompressedSize,                    // Uncompressed size
			strlen($entry->path),                        // File name length
			strlen($entry->extra),                       // Extra field length
			strlen($entry->fileComment),                 // File comment length
			$entry->diskNumber,                          // Disk number where file starts
			$entry->internalAttributes,                  // Internal file attributes
			$entry->externalAttributes,                  // External file attributes
			$entry->firstByteAt                          // Relative offset of local file header
		);

		return fwrite($stream, $data . $entry->path . $entry->extra . $entry->fileComment);
	}

	/**
	 * Writes the end of central directory entry to a zip file.
	 *
	 * The end of central directory entry is structured as follows:
	 *
	 * ```
	 * Offset    Bytes    Description[33]
	 *   0         4        End of central directory signature = 0x06054b50
	 *   4         2        Number of this disk (or 0xffff for ZIP64)
	 *   6         2        Disk where central directory starts (or 0xffff for ZIP64)
	 *   8         2        Number of central directory records on this disk (or 0xffff for ZIP64)
	 *   10        2        Total number of central directory records (or 0xffff for ZIP64)
	 *   12        4        Size of central directory (bytes) (or 0xffffffff for ZIP64)
	 *   16        4        Offset of start of central directory, relative to start of archive (or 0xffffffff for ZIP64)
	 *   20        2        Comment length (n)
	 *   22        n        Comment
	 * ```
	 *
	 * @param resource $stream
	 */
	protected static function writeEndCentralDirectoryEntry( $stream, ZipEndCentralDirectoryEntry $entry ) {
		$data = pack(
			'VvvvvVVv',
			self::SIGNATURE_CENTRAL_DIRECTORY_END,       // End of central directory signature
			$entry->diskNumber,                          // Number of this disk
			$entry->centralDirectoryStartDisk,           // Disk where central directory starts
			$entry->numberCentralDirectoryRecordsOnThisDisk, // Number of central directory records on this disk
			$entry->numberCentralDirectoryRecords,       // Total number of central directory records
			$entry->centralDirectorySize,                // Size of central directory (bytes)
			$entry->centralDirectoryOffset,              // Offset of start of central directory
			strlen($entry->comment)                      // Comment length
		);
		
		return fwrite($stream, $data . $entry->comment);
	}
}
