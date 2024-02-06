<?php

defined('ABSPATH') || exit;

function playground_escape_array($array)
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

function playground_dump_db($zip)
{
	global $wpdb;

	$tables   = playground_get_db_tables();
	$sql_dump = array();

	foreach ($tables as $table) {
		array_push(
			$sql_dump,
			sprintf("DROP TABLE IF EXISTS `%s`;", esc_sql($table)),
			playground_dump_db_schema($table)
		);
	}

	foreach ($tables as $table) {
		$records = $wpdb->get_results(
			sprintf(
				'SELECT * FROM `%s`',
				esc_sql($table)
			),
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
					'INSERT INTO `%1$s` (%2$s) VALUES (%3$s);',
					esc_sql($table),
					playground_escape_array(
						array_keys($record)
					),
					playground_escape_array(array_values($record))
				)
			);
		}
	}
	$zip->addFile('schema/_Schema.sql', implode("\n", $sql_dump));

}

function playground_get_db_tables()
{
	global $wpdb;
	$tables = $wpdb->get_results('SHOW TABLES', ARRAY_N);
	return array_column($tables, 0);
}

function playground_dump_db_schema($table)
{
	global $wpdb;
	$schema = $wpdb->get_row(
		sprintf('SHOW CREATE TABLE `%s`', esc_sql($table)),
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
