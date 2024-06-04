<?php

namespace WordPress\Zip;

class ZipFileEntry {

	/**
	 * The size of the ZIP file entry header in bytes.
	 * 
	 * @var int
	 */
	const HEADER_SIZE = 30;

	/**
	 * @var bool
	 */
	public $isDirectory;
	/**
	 * @var int
	 */
	public $version;
	/**
	 * @var int
	 */
	public $generalPurpose;
	/**
	 * @var int
	 */
	public $compressionMethod;
	/**
	 * @var int
	 */
	public $lastModifiedTime;
	/**
	 * @var int
	 */
	public $lastModifiedDate;
	/**
	 * @var int
	 */
	public $crc;
	/**
	 * @var int
	 */
	public $compressedSize;
	/**
	 * @var int
	 */
	public $uncompressedSize;
	/**
	 * @var string
	 */
	public $path;
	/**
	 * @var string
	 */
	public $extra;
	/**
	 * @var string
	 */
	public $bytes;

	public function __construct(
		int $version,
		int $generalPurpose,
		int $compressionMethod,
		int $lastModifiedTime,
		int $lastModifiedDate,
		int $crc,
		int $compressedSize,
		int $uncompressedSize,
		string $path,
		string $extra,
		string $bytes
	) {
		$this->bytes             = $bytes;
		$this->extra             = $extra;
		$this->path              = $path;
		$this->uncompressedSize  = $uncompressedSize;
		$this->compressedSize    = $compressedSize;
		$this->crc               = $crc;
		$this->lastModifiedDate  = $lastModifiedDate;
		$this->lastModifiedTime  = $lastModifiedTime;
		$this->compressionMethod = $compressionMethod;
		$this->generalPurpose    = $generalPurpose;
		$this->version           = $version;
		$this->isDirectory       = substr( $this->path, -1 ) === '/';
	}

	public function isFileEntry() {
		return true;
	}

	public function size() {
		return (
			self::HEADER_SIZE + 
			strlen($this->path) + 
			strlen($this->extra) + 
			$this->compressedSize
		);
	}
}
