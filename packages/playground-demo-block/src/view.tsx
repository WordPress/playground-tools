import React from 'react';
import { createRoot } from '@wordpress/element';
import PlaygroundDemo from './components/PlaygroundDemo';

const playgroundDemo = Array.from(
	document.getElementsByClassName('playground-demo')
);

for (const element of playgroundDemo) {
	const rootElement = element as HTMLDivElement;
	const root = createRoot(rootElement);
	const attributes = JSON.parse(
		atob(rootElement.dataset['attributes'] || '')
	);

	root.render(<PlaygroundDemo {...attributes} />);
}
