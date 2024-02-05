<?php

defined('ABSPATH') || exit;

function collector_stringify_insert_data($records)
{
	return implode(
		', ',
		array_map(
			function ($f) {
				return "`" . esc_sql($f) . "`";
			},
			$records
		)
	);
}

function collector_dump_db($zip)
{
	global $wpdb;

	$tables   = collector_get_db_tables();
	$sql_dump = [];

	foreach ($tables as $table) {
		array_push(
			$sql_dump,
			sprintf("DROP TABLE IF EXISTS `%s`;", esc_sql($table)),
			preg_replace("/\s+/", " ", collector_dump_db_schema($table))
		);
	}

	// Process in reverse order so wp_users comes before wp_options
	foreach (array_reverse($tables) as $table) {
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
					'INSERT INTO `%s` (%s) VALUES (%s);',
					esc_sql($table),
					implode(', ', array_map('esc_sql', array_keys($record))),
					implode(', ', array_map(fn ($f) => "'" . esc_sql($f) . "'", array_values($record))),
				)
			);
		}
	}
	$zip->addFile('schema/_Schema.sql', implode("\n", $sql_dump));
}

function collector_get_db_tables()
{
	global $wpdb;
	$tables = $wpdb->get_results('SHOW TABLES', ARRAY_N);
	return array_map(fn ($t) => $t[0], $tables);
}

function collector_dump_db_schema($table)
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
	return $schema['Create Table'];
}
