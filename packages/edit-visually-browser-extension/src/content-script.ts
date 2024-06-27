import {
	awaitReply,
	postMessageExpectReply,
	responseTo,
} from '@php-wasm/web-service-worker';
import { LOOPBACK_SW_URL } from './config';

function enableEditInPlaygroundButton() {
	let currentElement: any = undefined;
	let activeEditor: any = undefined;
	const button = createEditButton();

	document.body.appendChild(button);
	document.body.addEventListener('focusin', (event: any) => {
		showButtonIfNeeded(event.target!);
	});
	showButtonIfNeeded(document.activeElement);

	document.body.addEventListener('focusout', () => {
		hideButton(button);
	});

	function showButtonIfNeeded(element: any) {
		const domain = window.location.hostname;
		if (
			!domain.endsWith('github.com') &&
			domain !== 'meta.trac.wordpress.org'
		) {
			return;
		}
		if (element!.tagName !== 'TEXTAREA' && !element!.isContentEditable) {
			return;
		}
		showButton(element);
	}

	let buttonInterval: any;
	function showButton(element: any) {
		currentElement = element;
		buttonInterval = setInterval(() => {
			const rect = element.getBoundingClientRect();
			button.style.display = 'block';
			button.style.top = `${
				window.scrollY + rect.bottom - button.offsetHeight
			}px`;
			button.style.left = `${window.scrollX + rect.left}px`;
		}, 100);
	}

	function hideButton(button: HTMLButtonElement) {
		currentElement = undefined;
		button.style.display = 'none';
		clearInterval(buttonInterval);
	}

	function createEditButton() {
		const button = document.createElement('button');
		button.textContent = 'Edit in Playground';
		button.className = 'edit-btn';
		button.style.transition = 'top 0.15s ease-in, left 0.15s ease-in';
		button.style.position = 'absolute';
		button.style.display = 'none';
		button.style.padding = '5px 10px';
		button.style.backgroundColor = '#007bff';
		button.style.color = 'white';
		button.style.border = 'none';
		button.style.cursor = 'pointer';
		button.addEventListener('mousedown', async (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (
				activeEditor?.editor?.windowHandle &&
				!activeEditor.editor.windowHandle.closed
			) {
				activeEditor.editor.windowHandle.focus();
				return;
			}
			if (
				!activeEditor ||
				!activeEditor.editor.windowHandle ||
				activeEditor.editor.windowHandle.closed ||
				activeEditor.element !== currentElement
			) {
				activeEditor?.editor.windowHandle?.close();
				activeEditor = {
					element: currentElement,
					editor: await openPlaygroundEditorForEditable(
						currentElement
					),
				};
			}
		});
		return button;
	}
}

enableEditInPlaygroundButton();

let playgroundEditor: any = null;
// Function to wait until DOM is fully loaded
async function openPlaygroundEditorForEditable(element: any) {
	const localEditor = wrapLocalEditable(element);
	const initialValue = localEditor.getValue();
	playgroundEditor = await openPlaygroundEditor({
		format: 'markdown',
		initialValue,
		onClose(lastValue: string | null) {
			if (lastValue !== null) {
				lastRemoteValue = lastValue;
				localEditor.setValue(lastValue);
			}
			cleanup.forEach((fn) => fn());
		},
	});

	// Update the local editor when the playground editor changes
	let lastRemoteValue = initialValue;
	const pollInterval = setInterval(() => {
		playgroundEditor.getValue().then((value) => {
			if (value !== lastRemoteValue) {
				lastRemoteValue = value;
				localEditor.setValue(value);
			}
		});
	}, 1000);

	const cleanup = [
		// When typing in the textarea, update the playground editor
		bindEventListener(element, 'change', () => {
			const value = localEditor.getValue();
			playgroundEditor.setValue(value);
			lastRemoteValue = value;
		}),
		() => {
			pollInterval && clearInterval(pollInterval);
		},
	];

	return playgroundEditor;
}

function bindEventListener(target: any, type: string, listener: any) {
	target.addEventListener(type, listener);
	return () => target.removeEventListener(type, listener);
}

function wrapLocalEditable(element: any) {
	if (element.tagName === 'TEXTAREA') {
		return {
			getValue() {
				return element.value;
			},
			setValue(value: string) {
				element.value = value;
			},
		};
	} else if (element.isContentEditable) {
		return {
			getValue() {
				return element.innerHTML;
			},
			setValue(value: string) {
				element.innerHTML = value;
			},
		};
	}
	throw new Error(
		'Unsupported element type, only Textarea and contenteditable elements are accepted.'
	);
}

interface PlaygroundEditorOptions {
	format: 'markdown' | 'trac';
	initialValue: string;
	onClose?: (value: string | null) => void;
}

async function openPlaygroundEditor({
	format,
	initialValue,
	onClose,
}: PlaygroundEditorOptions) {
	const windowHandle = window.open(
		`${LOOPBACK_SW_URL}/wp-admin/post-new.php?post_type=post`,
		'_blank',
		'width=850,height=600'
	)!;

	if (null === windowHandle) {
		throw new Error('Failed to open the playground editor window');
	}

	await new Promise((resolve, reject) => {
		const unbindRejectionListener = onWindowClosed(windowHandle, () => {
			unbindBootListener();
			unbindRejectionListener();
			reject();
		});

		const unbindBootListener = bindEventListener(
			window,
			'message',
			(event: MessageEvent) => {
				if (
					event.source === windowHandle &&
					event.data.command === 'getBootParameters'
				) {
					unbindBootListener();
					unbindRejectionListener();
					windowHandle.postMessage(
						responseTo(event.data.requestId, {
							value: initialValue,
							format: format,
						}),
						'*'
					);
					resolve(null);
				}
			}
		);
	});

	let lastRemoteValue: string | null = null;
	const unbindCloseListener = bindEventListener(
		window,
		'message',
		(event: MessageEvent) => {
			if (event.source !== windowHandle) {
				return;
			}
			switch (event.data.command) {
				case 'updateBeforeClose':
					lastRemoteValue = event.data.text;
					break;
			}
		}
	);

	onWindowClosed(windowHandle, () => {
		unbindCloseListener();
		onClose && onClose(lastRemoteValue || initialValue);
	});

	// Close the editor popup if the user navigates away
	bindEventListener(window, 'beforeunload', () => {
		windowHandle.close();
	});

	return {
		windowHandle,
		async getValue() {
			const requestId = postMessageExpectReply(
				windowHandle,
				{
					command: 'getEditorContent',
				},
				'*'
			);
			const response = await awaitReply(window, requestId);
			return response.value;
		},
		setValue(value: string) {
			windowHandle.postMessage(
				{
					command: 'setEditorContent',
					value,
					type: 'relay',
				},
				'*'
			);
		},
		addAndFocusOnEmptyParagraph() {
			windowHandle.postMessage(
				{
					command: 'addAndFocusOnEmptyParagraph',
					type: 'relay',
				},
				'*'
			);
		},
	};
}

// Function to check if the window is closed
function onWindowClosed(windowObject: any, callback: any) {
	// Set an interval to periodically check if the window is closed
	const timer = setInterval(checkWindowClosed, 500);
	function unbind() {
		clearInterval(timer);
	}
	function checkWindowClosed() {
		if (!windowObject || windowObject.closed) {
			unbind();
			callback();
		}
	}
	return unbind;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request?.command === 'actionClicked') {
		const selectedText = window.getSelection()?.toString() || '';
		const quotedSelectedText =
			selectedText
				.split('\n')
				.map((line) => `> ${line}`)
				.join('\n') + '\n> \n\n';
		appendToPlaygroundEditor(quotedSelectedText);
	}
});

async function appendToPlaygroundEditor(text: string) {
	if (playgroundEditor && !playgroundEditor?.windowHandle?.closed) {
		playgroundEditor.windowHandle.focus();
		const value = await playgroundEditor.getValue();
		await playgroundEditor.setValue(`${value}\n\n${text} `);
	} else {
		playgroundEditor = await openPlaygroundEditor({
			format: 'markdown',
			initialValue: text,
			onClose(lastValue: string | null) {
				navigator.clipboard.writeText(lastValue || '');
			},
		});
	}
	await playgroundEditor.addAndFocusOnEmptyParagraph();
}
