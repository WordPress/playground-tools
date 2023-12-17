<?php

function collector_esc_sql_identifier($tableName) {
	return str_replace('`', '``', esc_sql($tableName));
}

function collector_dump_db($zip)
{
	$tables   = collector_get_db_tables();
	$sqlFile  = collector_get_tmpfile('schema', 'sql');
	$tmpFiles = [$sqlFile];

	file_put_contents($sqlFile, sprintf("-- %s\n", json_encode(['SECTION START' => 'SCHEMA'])), FILE_APPEND);

	foreach($tables as $table)
	{
		file_put_contents($sqlFile, sprintf("-- %s\n", json_encode(['ACTION' => 'DROP', 'TABLE' => $table])), FILE_APPEND);
		file_put_contents($sqlFile, sprintf("DROP TABLE IF EXISTS `%s`;\n", collector_esc_sql_identifier($table)), FILE_APPEND);
		file_put_contents($sqlFile, sprintf("-- %s\n", json_encode(['ACTION' => 'CREATE', 'TABLE' => $table])), FILE_APPEND);
		file_put_contents($sqlFile, preg_replace("/\s+/", " ", collector_dump_db_schema($table)) . "\n", FILE_APPEND);
	}

	file_put_contents($sqlFile, sprintf("-- %s\n", json_encode(['SECTION END' => 'SCHEMA'])), FILE_APPEND);
	file_put_contents($sqlFile, sprintf("-- %s\n", json_encode(['SECTION START' => 'RECORDS'])), FILE_APPEND);

	global $wpdb;

	// Process in reverse order so wp_users comes before wp_options
	// meaning the fakepass will be cleared before transients are
	// dumped to the schema backup in the zip
	foreach(array_reverse($tables) as $table)
	{
		file_put_contents($sqlFile, sprintf("-- %s\n", json_encode(['ACTION' => 'INSERT', 'TABLE' => $table])), FILE_APPEND);

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

			file_put_contents($sqlFile, $insert . "\n", FILE_APPEND);

			if(--$remaining <= 0)
			{
				break;
			}
		}
	}

	file_put_contents($sqlFile, sprintf("-- %s\n", json_encode(['SECTION END' => 'RECORDS'])), FILE_APPEND);

	$zip->addFile($sqlFile, 'schema/_Schema.sql');

	return $tmpFiles;
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
