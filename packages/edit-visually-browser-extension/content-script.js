function makePlaygroundBlueprint(initialValue, initialFormat) {
	return {
		login: true,
		landingPage: '/wp-admin/post-new.php?post_type=post',
		preferredVersions: {
			wp: 'nightly',
			php: '8.0',
		},
		steps: [
			{
				step: 'mkdir',
				path: '/wordpress/wp-content/plugins/playground-editor',
			},
			{
				step: 'installPlugin',
				pluginZipFile: {
					resource: 'url',
					url: 'https://github-proxy.com/proxy/?repo=dmsnell/blocky-formats',
				},
				options: {
					activate: false,
				},
			},
			{
				step: 'mv',
				fromPath: '/wordpress/wp-content/plugins/blocky-formats-trunk',
				toPath: '/wordpress/wp-content/plugins/blocky-formats',
			},
			{
				step: 'activatePlugin',
				pluginPath: 'blocky-formats/blocky-formats.php',
			},
			{
				step: 'writeFile',
				path: '/wordpress/wp-content/plugins/playground-editor/script.js',
				data: `

				function waitForDOMContentLoaded() {
					return new Promise((resolve) => {
						if (
							document.readyState === 'complete' ||
							document.readyState === 'interactive'
						) {
							resolve();
						} else {
							document.addEventListener('DOMContentLoaded', resolve);
						}
					});
				}

				await import('../blocky-formats/vendor/commonmark.min.js');
				const { markdownToBlocks, blocks2markdown } = await import('../blocky-formats/src/markdown.js');
                const formatConverters = {
                    markdown: {
                        toBlocks: markdownToBlocks,
                        fromBlocks: blocks2markdown
                    }
                };
    
                function populateEditorWithFormattedText(text, format) {
                    if(!(format in formatConverters)) {
                        throw new Error('Unsupported format');
                    }

					const createBlocks = blocks => blocks.map(block => wp.blocks.createBlock(block.name, block.attributes, createBlocks(block.innerBlocks)));
                    const rawBlocks = formatConverters[format].toBlocks(text);

                    window.wp.data
                        .dispatch('core/block-editor')
                        .resetBlocks(createBlocks(rawBlocks))
                }
    
                function pushEditorContentsToParent(format) {
                    const blocks = wp.data.select('core/block-editor').getBlocks();
					window.parent.postMessage({
						command: 'playgroundEditorTextChanged',
						format: format,
						text: formatConverters[format].fromBlocks(blocks),
						type: 'relay'
					}, '*');
                }
    
                // Accept commands from the parent window
                window.addEventListener('message', (event) => {
                    if(typeof event.data !== 'object') {
                        return;
                    }
                    
                    const { command, format, text } = event.data;
                    lastKnownFormat = format;
    
                    if(command === 'setEditorContent') {
                        populateEditorWithFormattedText(text, format);
                    } else if(command === 'getEditorContent') {
                        const blocks = wp.data.select('core/block-editor').getBlocks();
                        window.parent.postMessage({
                            command: 'playgroundEditorTextChanged',
                            format: format,
                            text: formatConverters[format].fromBlocks(blocks),
                            type: 'relay'
                        }, '*');
                    }
                });

                // Populate the editor with the initial value
                let lastKnownFormat = ${JSON.stringify(initialFormat)};
                waitForDOMContentLoaded().then(() => {
                    // @TODO: Don't do timeout.
                    //        Instead, populate the editor immediately after it's ready.
                    setTimeout(() => {
                        populateEditorWithFormattedText(
                            ${JSON.stringify(initialValue)},
                            lastKnownFormat
                        );
    
                        // const debouncedPushEditorContents = debounce(pushEditorContentsToParent, 600);
                        // let previousBlocks = undefined;
                        // let subscribeInitialized = false;
                        // wp.data.subscribe(() => {
                        //     if(previousBlocks === undefined) {
                        //         previousBlocks = wp.data.select('core/block-editor').getBlocks();
                        //         return;
                        //     }
                        //     const currentBlocks = wp.data.select('core/block-editor').getBlocks();
                        //     if (previousBlocks !== currentBlocks) {
                        //         debouncedPushEditorContents(lastKnownFormat);
                        //         previousBlocks = currentBlocks;
                        //     }
                        // });
                    }, 500)

                    // Experiment with sending the updated value back to the parent window
                    // when typing. Debounce by 600ms.
                    function debounce(func, wait) {
                        let timeout;
                        return function(...args) {
                            const context = this;
                            clearTimeout(timeout);
                            timeout = setTimeout(() => func.apply(context, args), wait);
                        };
                    }
                });
                `,
			},
			{
				step: 'writeFile',
				path: '/wordpress/wp-content/plugins/playground-editor/index.php',
				data: `<?php
    /**
    * Plugin Name: Playground Editor
    * Description: A simple plugin to edit rich text formats in Gutenberg.
    */
    // Disable welcome panel every time a user accesses the editor
    function disable_gutenberg_welcome_on_load() {
    if (is_admin()) {
    update_user_meta(get_current_user_id(), 'show_welcome_panel', 0);
    remove_action('enqueue_block_editor_assets', 'wp_enqueue_editor_tips');
    }
    }
    add_action('admin_init', 'disable_gutenberg_welcome_on_load');
    
    function enqueue_script() {
    	wp_enqueue_script( 'playground-editor-script', plugin_dir_url( __FILE__ ) . 'script.js', array( 'jquery' ), '1.0', true );
    }
    add_action( 'admin_init', 'enqueue_script' );
    
    // Set script attribute to module
    add_filter('script_loader_tag', function($tag, $handle, $src) {
    if ($handle === 'playground-editor-script') {
		$tag = '<script type="module" src="' . esc_url($src) . '">'.'<'.'/script>';
    }
    return $tag;
    }, 10, 3);
                `,
			},
			{
				step: 'activatePlugin',
				pluginPath: 'playground-editor/index.php',
			},
		],
	};
}

class PlaygroundEditorComponent extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'open' });
		shadow.innerHTML = `<iframe></iframe>`;
		const iframe = shadow.querySelector('iframe');
		iframe.style.width = `100%`;
		iframe.style.height = `100%`;
		iframe.style.border = '1px solid #000';
	}

	static get observedAttributes() {
		return ['format', 'value'];
	}

	_value = '';
	get value() {
		return this._value;
	}
	set value(newValue) {
		this._value = newValue;
		this.setRemoteValue(newValue);
	}
	setAttribute(name, value) {
		super.setAttribute(name, value);
		console.log('setAttribute(', name, ',', value, ')');
	}

	connectedCallback() {
		const initialValue = this.getAttribute('value');
		const initialFormat = this.getAttribute('format');

		this.shadowRoot.querySelector('iframe').src =
			'https://playground.wordpress.net/?mode=seamless#' +
			JSON.stringify(
				makePlaygroundBlueprint(initialValue, initialFormat)
			);

		window.addEventListener('message', (event) => {
			console.log('message', event.data);
			if (typeof event.data !== 'object') {
				return;
			}
			const { command, format, text } = event.data;
			if (command === 'playgroundEditorTextChanged') {
				this.dispatchEvent(
					new CustomEvent('change', {
						detail: {
							format,
							text,
						},
					})
				);
			}
		});
	}

	async getRemoteValue() {
		return new Promise((resolve) => {
			this.addEventListener('change', (event) => {
				resolve(event.detail);
			});
			this.shadowRoot.querySelector('iframe').contentWindow.postMessage(
				{
					command: 'getEditorContent',
					format: this.getAttribute('format'),
					type: 'relay',
				},
				'*'
			);
		});
	}

	setRemoteValue(value) {
		const message = {
			command: 'playgroundEditorTextChanged',
			format: this.getAttribute('format'),
			text: this.value,
			type: 'relay',
		};
		this.shadowRoot
			.querySelector('iframe')
			?.contentWindow?.postMessage(message, '*');
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'value') {
			this.value = newValue;
		}
	}
}

customElements.define('playground-editor', PlaygroundEditorComponent);

// Function to wait until DOM is fully loaded
function waitForDOMContentLoaded() {
	return new Promise((resolve) => {
		if (
			document.readyState === 'complete' ||
			document.readyState === 'interactive'
		) {
			resolve();
		} else {
			document.addEventListener('DOMContentLoaded', resolve);
		}
	});
}

function activatePlaygroundEditor(element = undefined) {
	element =
		element ??
		document.activeElement.closest('textarea, [contenteditable]');
	if (!element) {
		return;
	}

	if (element.tagName === 'TEXTAREA') {
		showPlaygroundDialog({
			value: element.value,
			format: 'markdown', // @TODO dynamic
			onClose: ({ text, format }) => {
				element.value = text;
			},
		});
	} else {
		showPlaygroundDialog({
			value: element.innerHTML,
			format: 'markdown', // @TODO dynamic
			onClose: ({ text, format }) => {
				element.innerHTML = text;
			},
		});
	}
}

// Function to show the Playground modal
function showPlaygroundDialog({
	value,
	format = 'markdown',
	onChange = () => {},
	onClose = () => {},
}) {
	// Create modal element
	const modal = document.createElement('dialog');
	modal.style.width = '80%';
	modal.style.height = '80%';
	modal.style.border = 'none';

	const editor = new PlaygroundEditorComponent();
	editor.setAttribute('value', value);
	editor.setAttribute('format', format);
	editor.addEventListener('change', (event) => {
		console.log({ value });
		// onChange(event.target.getRemoteValue);
	});

	// Append iframe to modal
	modal.appendChild(editor);
	document.body.appendChild(modal);
	modal.showModal();

	// Close modal when clicking outside of it
	modal.addEventListener('click', async (event) => {
		if (event.target === modal) {
			const value = await Promise.race([
				editor.getRemoteValue(),
				new Promise((resolve) => setTimeout(resolve, 500)),
			]);
			modal.close();
			modal.remove();
			onClose(value);
		}
	});
}

document.addEventListener('keydown', (event) => {
	if (event.ctrlKey && event.shiftKey && event.key === 'O') {
		activatePlaygroundEditor();
	}
});

// ---- Add Edit in Playground button ----

(function () {
	function createEditButton() {
		const button = document.createElement('button');
		button.textContent = 'Edit in Playground';
		button.className = 'edit-btn';
		button.style.position = 'absolute';
		button.style.display = 'none';
		button.style.padding = '5px 10px';
		button.style.backgroundColor = '#007bff';
		button.style.color = 'white';
		button.style.border = 'none';
		button.style.cursor = 'pointer';
		button.addEventListener('mousedown', (event) => {
			event.preventDefault();
			event.stopPropagation();
			activatePlaygroundEditor();
		});
		return button;
	}

	function showButton(element, button) {
		const rect = element.getBoundingClientRect();
		button.style.display = 'block';
		button.style.top = `${window.scrollY + rect.top}px`;
		button.style.left = `${
			window.scrollX + rect.right - button.offsetWidth
		}px`;
	}

	function hideButton(button) {
		button.style.display = 'none';
	}

	const button = createEditButton();
	document.body.appendChild(button);

	document.body.addEventListener('focusin', (event) => {
		const element = event.target;
		if (element.tagName === 'TEXTAREA' || element.isContentEditable) {
			showButton(element, button);
		}
	});

	document.body.addEventListener('focusout', () => {
		hideButton(button);
	});
})();
