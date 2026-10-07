<?php
/**
 * SQL export regressions. Run with: php tests/playground-export.php
 *
 * @package Playground
 */

namespace WordPress\Playground;

// This standalone CLI test runs without WordPress escaping functions.
// phpcs:disable WordPress.Security.EscapeOutput

define( 'ABSPATH', __DIR__ . '/' );
define( 'ARRAY_A', 'ARRAY_A' );

require __DIR__ . '/../packages/playground/src/playground-db.php';

test_schema_terminators();
echo "Playground SQL export tests passed.\n";

/**
 * Check that SHOW CREATE TABLE results become separate executable statements.
 */
function test_schema_terminators() {
	global $wpdb;
	// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Supply the database double for this isolated test.
	$wpdb = new class() {
		/**
		 * Last database error.
		 *
		 * @var string
		 */
		public $last_error = '';
		/**
		 * SHOW CREATE TABLE result.
		 *
		 * @var string
		 */
		public $schema;

		/**
		 * Quote a table name.
		 *
		 * @param string $table Table name.
		 * @return string Quoted identifier.
		 */
		public function quote_identifier( $table ) {
			return '`' . $table . '`';
		}

		/**
		 * Return the schema fixture for the requested table.
		 *
		 * @param string $query  Schema query.
		 * @param string $format Result format.
		 * @return array Schema result.
		 */
		public function get_row( $query, $format ) {
			expect_same( 'SHOW CREATE TABLE `wp_example`', $query, 'Query the table schema' );
			expect_same( ARRAY_A, $format, 'Request an associative result' );
			return array( 'Create Table' => $this->schema );
		}
	};
	foreach ( array( "CREATE TABLE `wp_example` (\n  `id` int\n)", 'CREATE TABLE `wp_example` (  `id` int);' ) as $schema ) {
		$wpdb->schema = $schema;
		expect_same( 'CREATE TABLE `wp_example` (  `id` int);', dump_db_schema( 'wp_example' ), 'Terminate CREATE TABLE exactly once' );
	}
}

/**
 * Assert without relying on PHP's optional assert configuration.
 *
 * @param mixed  $expected Expected value.
 * @param mixed  $actual   Actual value.
 * @param string $message  Assertion description.
 * @throws \RuntimeException When the assertion fails.
 */
function expect_same( $expected, $actual, $message ) {
	if ( $expected !== $actual ) {
		throw new \RuntimeException( $message );
	}
}
