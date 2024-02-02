<?php

function collector_esc_sql_identifier($tableName) {
	return str_replace('`', '``', esc_sql($tableName));
}

function collector_dump_db($zip)
{
	$tables   = collector_get_db_tables();
	$sql_dump = '';

	$sql_dump .= sprintf("-- %s\n", json_encode(['SECTION START' => 'SCHEMA']));

	foreach($tables as $table)
	{
		$sql_dump .= sprintf("-- %s\n", json_encode(['ACTION' => 'DROP', 'TABLE' => $table]));
		$sql_dump .= sprintf("DROP TABLE IF EXISTS `%s`;\n", collector_esc_sql_identifier($table));
		$sql_dump .= sprintf("-- %s\n", json_encode(['ACTION' => 'CREATE', 'TABLE' => $table]));
		$sql_dump .= preg_replace("/\s+/", " ", collector_dump_db_schema($table)) . "\n";
	}

	$sql_dump .= sprintf("-- %s\n", json_encode(['SECTION END' => 'SCHEMA']));
	$sql_dump .= sprintf("-- %s\n", json_encode(['SECTION START' => 'RECORDS']));

	global $wpdb;

	// Process in reverse order so wp_users comes before wp_options
	// meaning the fakepass will be cleared before transients are
	// dumped to the schema backup in the zip
	foreach(array_reverse($tables) as $table)
	{
		$sql_dump .= sprintf("-- %s\n", json_encode(['ACTION' => 'INSERT', 'TABLE' => $table]));

		$wpdb->query(sprintf('SELECT * FROM `%s`', collector_esc_sql_identifier($table)));

		$remaining = $wpdb->result->num_rows;

		if(!$remaining)
		{
			continue;
		}

		foreach($wpdb->result as $record)
		{
			if($table === 'wp_users' && (int) $record['ID'] === (int) wp_get_current_user()->ID)
			{
				$record['user_pass'] = wp_hash_password(collector_use_fakepass());
			}

			$insert = sprintf(
				'INSERT INTO `%s` (%s) VALUES (%s);',
				esc_sql($table),
				implode(', ', array_map(fn($f) => "`" . collector_esc_sql_identifier($f) . "`", array_keys($record))),
				implode(', ', array_map(fn($f) => "'" . esc_sql($f) . "'", array_values($record))),
			);

			$sql_dump .= $insert . "\n";

			if(--$remaining <= 0)
			{
				break;
			}
		}
	}

	$sql_dump .= sprintf("-- %s\n", json_encode(['SECTION END' => 'RECORDS']));
	$zip->addFile('schema/_Schema.sql', $sql_dump);
}

function collector_get_db_tables()
{
	global $wpdb;
	$tables = $wpdb->get_results('SHOW TABLES', ARRAY_N);
	return array_map(fn($t) => $t[0], $tables);
}

function collector_dump_db_schema($table)
{
	global $wpdb;
	return $wpdb
	->get_row(sprintf('SHOW CREATE TABLE `%s`', esc_sql($table)), OBJECT)
	->{'Create Table'};
}