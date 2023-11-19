<?php

$element = sprintf(
	"<div class='playground-demo' data-attributes='%s'></div>",
	base64_encode( json_encode( $attributes ) )
);

printf(
	"<div %s>%s</div>",
	get_block_wrapper_attributes(),
	$element
);
