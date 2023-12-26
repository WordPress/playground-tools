import React from 'react';
import { createRoot } from '@wordpress/element';
import PlaygroundPreview from './components/playground-preview';

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
