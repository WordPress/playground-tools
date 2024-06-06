<?php
// phpcs:ignoreFile WordPress.DB.DirectDatabaseQuery.DirectQuery
namespace WordPress\Playground;
use WordPress\Zip\ZipStreamWriter;

defined('ABSPATH') || exit;

/**
 * Escape an array of values for use in a SQL query.
 *
 * @param array $array The array of values to escape.
 * @return string The escaped values, separated by commas.
 */
function escape_array($array)
{
	global $wpdb;
	$escaped = array();
	foreach ($array as $value) {
		if (is_numeric($value)) {
			$escaped[] = $wpdb->prepare('%d', $value);
		} else {
			$escaped[] = $wpdb->prepare('%s', $value);
		}
	}
	return implode(',', $escaped);
}

/**
 * Create a database dump and add it to a zip archive.
 *
 * @param ZipStreamWriter $zip The zip archive to add the database dump to.
 */
function zip_database(ZipStreamWriter $zip)
{
	global $wpdb;

	$tables   = get_db_tables();
	$sql_dump = array();

	foreach ($tables as $table) {
		array_push(
			$sql_dump,
			sprintf(
				"DROP TABLE IF EXISTS %s;",
				$wpdb->quote_identifier($table)
			),
			dump_db_schema($table)
		);
	}

	foreach ($tables as $table) {
		$records = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			sprintf('SELECT * FROM %s', $wpdb->quote_identifier($table)),
			ARRAY_A
		);

		if ($wpdb->last_error) {
			error_log($wpdb->last_error);
			continue;
		}

		foreach ($records as $record) {
			array_push(
				$sql_dump,
				sprintf(
					'INSERT INTO %1$s VALUES (%2$s);',
					$wpdb->quote_identifier($table),
					escape_array(array_values($record))
				)
			);
		}
	}

	$zip->writeFileFromString(
		'wp-content/database/database.sql',
		implode("\n", $sql_dump)
	);
}

/**
 * Get a list of all the tables in the database.
 *
 * @return array The list of tables in the database.
 */
function get_db_tables()
{
	global $wpdb;
	$prefix = $wpdb->prefix;
	$tables = $wpdb->get_results("SHOW TABLES LIKE '{$prefix}%'", ARRAY_N);

	$tables = array_column($tables, 0);
	
	// Workaround – On SQLite we have a list of objects, while on MySQL
	// we're getting a list of strings. Let's normalize it here until
	// a proper fix is shipped in the SQLite plugin.
	// https://github.com/WordPress/sqlite-database-integration/pull/117
	// https://github.com/WordPress/sqlite-database-integration/pull/118
	foreach ( $tables as $k => $table ) {
		if ( is_object( $table ) ) {
			$tables[$k] = $table->Tables_in_db;
		}
	}

	$tables = apply_filters(
		'playground_db_tables',
		$tables
	);

	return $tables;
}

/**
 * Get the schema for a database table.
 *
 * @param string $table The name of the table to get the schema for.
 * @return string The schema for the table.
 */
function dump_db_schema($table)
{
	global $wpdb;
	$schema = $wpdb->get_row(
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		sprintf('SHOW CREATE TABLE %s', $wpdb->quote_identifier($table)),
		ARRAY_A
	);
	if ($wpdb->last_error) {
		error_log($wpdb->last_error);
		return '';
	}
	if (!isset($schema['Create Table'])) {
		return '';
	}
	// A query needs to be on a single line
	return preg_replace("/\r?\n/", "", $schema['Create Table']);
}
