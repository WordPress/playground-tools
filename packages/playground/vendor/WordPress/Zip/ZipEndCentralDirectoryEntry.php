<?php

namespace WordPress\Zip;

class ZipEndCentralDirectoryEntry {

	/**
	 * @var int
	 */
	public $diskNumber;
	/**
	 * @var int
	 */
	public $centralDirectoryStartDisk;
	/**
	 * @var int
	 */
	public $numberCentralDirectoryRecordsOnThisDisk;
	/**
	 * @var int
	 */
	public $numberCentralDirectoryRecords;
	/**
	 * @var int
	 */
	public $centralDirectorySize;
	/**
	 * @var int
	 */
	public $centralDirectoryOffset;
	/**
	 * @var string
	 */
	public $comment;

	public function __construct(
		int $diskNumber,
		int $centralDirectoryStartDisk,
		int $numberCentralDirectoryRecordsOnThisDisk,
		int $numberCentralDirectoryRecords,
		int $centralDirectorySize,
		int $centralDirectoryOffset,
		string $comment
	) {
		$this->comment                                 = $comment;
		$this->centralDirectoryOffset                  = $centralDirectoryOffset;
		$this->centralDirectorySize                    = $centralDirectorySize;
		$this->numberCentralDirectoryRecords           = $numberCentralDirectoryRecords;
		$this->numberCentralDirectoryRecordsOnThisDisk = $numberCentralDirectoryRecordsOnThisDisk;
		$this->centralDirectoryStartDisk               = $centralDirectoryStartDisk;
		$this->diskNumber                              = $diskNumber;
	}

	public function isFileEntry() {
		return false;
	}
}
