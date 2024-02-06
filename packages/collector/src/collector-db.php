<?php

defined('ABSPATH') || exit;

function collector_escape_array($array)
{
	global $wpdb;
	$escaped = array();
	foreach ($array as $value) {
		if (is_numeric($value))
			$escaped[] = $wpdb->prepare('%d', $value);
		else
			$escaped[] = $wpdb->prepare('%s', $value);
	}
	return implode(',', $escaped);
}

function collector_dump_db($zip)
{
	global $wpdb;

	$tables   = collector_get_db_tables();
	$sql_dump = array();

	foreach ($tables as $table) {
		array_push(
			$sql_dump,
			sprintf("DROP TABLE IF EXISTS `%s`;", esc_sql($table)),
			collector_dump_db_schema($table)
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
					'INSERT INTO `%1$s` (%2$s) VALUES (%3$s);',
					esc_sql($table),
					collector_escape_array(
						array_keys($record)
					),
					collector_escape_array(array_values($record))
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
	return preg_replace("/\s+/", " ", $schema['Create Table']);
}
