<?php
/**
 * Renders the WordPress Playground block on server.
 *
 * @package WordPress/playground-block
 */

$element = sprintf(
	"<div class='wordpress-playground-block' data-attributes='%s'></div>",
	// $attributes is available, but WPCS doesn't know that and would complain
	// phpcs:disable VariableAnalysis.CodeAnalysis.VariableAnalysis.UndefinedVariable
	// phpcs:disable WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	// phpcs:disable WordPress.WP.AlternativeFunctions.json_encode_json_encode
	base64_encode( json_encode( $attributes ) )
);

printf(
	'<div %s>%s</div>',
	wp_kses_data( get_block_wrapper_attributes() ),
	// $element is explicitly defined above and only contains safe data,
	// we do not want to escape it as that wouldn't render valid HTML anymore.
	// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
	$element
);
