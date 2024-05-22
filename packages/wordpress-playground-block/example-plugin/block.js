(function (blocks, element) {
	var el = element.createElement;

	blocks.registerBlockType('block-tutorial/my-first-block', {
		edit: function () {
			return el('p', {}, 'Hello World - Block Editor');
		},
		save: function () {
			return el('p', {}, 'Hello World - Frontend');
		},
	});
})(window.wp.blocks, window.wp.element);
