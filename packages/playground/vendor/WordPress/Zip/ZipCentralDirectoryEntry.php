<?php

namespace WordPress\Zip;

class ZipCentralDirectoryEntry {

	const HEADER_SIZE = 46;

	public $isDirectory;
	public $firstByteAt;
	public $versionCreated;
	public $versionNeeded;
	public $generalPurpose;
	public $compressionMethod;
	public $lastModifiedTime;
	public $lastModifiedDate;
	public $crc;
	public $compressedSize;
	public $uncompressedSize;
	public $diskNumber;
	public $internalAttributes;
	public $externalAttributes;
	public $path;
	public $extra;
	public $fileComment;

	public function __construct(
		int $versionCreated,
		int $versionNeeded,
		int $generalPurpose,
		int $compressionMethod,
		int $lastModifiedTime,
		int $lastModifiedDate,
		int $crc,
		int $compressedSize,
		int $uncompressedSize,
		int $diskNumber,
		int $internalAttributes,
		int $externalAttributes,
		int $firstByteAt,
		string $path,
		string $extra,
		string $fileComment
	) {
		$this->fileComment        = $fileComment;
		$this->extra              = $extra;
		$this->path               = $path;
		$this->externalAttributes = $externalAttributes;
		$this->internalAttributes = $internalAttributes;
		$this->diskNumber         = $diskNumber;
		$this->uncompressedSize   = $uncompressedSize;
		$this->compressedSize     = $compressedSize;
		$this->crc                = $crc;
		$this->lastModifiedDate   = $lastModifiedDate;
		$this->lastModifiedTime   = $lastModifiedTime;
		$this->compressionMethod  = $compressionMethod;
		$this->generalPurpose     = $generalPurpose;
		$this->versionNeeded      = $versionNeeded;
		$this->versionCreated     = $versionCreated;
		$this->firstByteAt        = $firstByteAt;
		$this->isDirectory        = substr( $this->path, -1 ) === '/';
	}

	public function isFileEntry() {
		return false;
	}

	public function size() {
		return (
			self::HEADER_SIZE +
			strlen($this->path) +
			strlen($this->extra) +
			strlen($this->fileComment)
		);
	}
}
