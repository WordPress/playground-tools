import React from 'react';
import { createRoot } from '@wordpress/element';
import PlaygroundPreview from './components/playground-preview';

function renderPlaygroundPreview() {
	const playgroundDemo = Array.from(
		document.getElementsByClassName('wordpress-playground-block')
	);

	for (const element of playgroundDemo) {
		const rootElement = element as HTMLDivElement;
		const root = createRoot(rootElement);
		const attributes = JSON.parse(
			atob(rootElement.dataset['attributes'] || '')
		);

		root.render(<PlaygroundPreview {...attributes} />);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', renderPlaygroundPreview);
} else {
	renderPlaygroundPreview();
}
