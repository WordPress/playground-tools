import React from 'react';
import { createRoot } from '@wordpress/element';
import PlaygroundPreview from './components/playground-preview';
import { base64DecodeBlockAttributes, base64ToString } from './base64';

function renderPlaygroundPreview() {
	const playgroundDemo = Array.from(
		document.getElementsByClassName('wordpress-playground-block')
	);
	const urlParams = new URLSearchParams(location.search);
	if (
		urlParams.has('playground-full-page') &&
		urlParams.has('playground-attributes') &&
		playgroundDemo.length === 1
	) {
		const rootElement = playgroundDemo[0] as HTMLDivElement;
		const root = createRoot(rootElement);
		const encodedAttributes = urlParams.get(
			'playground-attributes'
		) as string;
		const attributeJson = base64ToString(encodedAttributes);
		const attributes = base64DecodeBlockAttributes(
			JSON.parse(attributeJson)
		) as any;

		root.render(
			<PlaygroundPreview {...attributes} inFullPageView={true} />
		);
	} else {
		for (const element of playgroundDemo) {
			const rootElement = element as HTMLDivElement;
			const root = createRoot(rootElement);
			const attributes = base64DecodeBlockAttributes(
				JSON.parse(atob(rootElement.dataset['attributes'] || ''))
			) as any;

			root.render(
				<PlaygroundPreview
					{...attributes}
					baseAttributesForFullPageView={attributes}
				/>
			);
		}
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', renderPlaygroundPreview);
} else {
	renderPlaygroundPreview();
}
