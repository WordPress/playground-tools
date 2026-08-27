import { registerBlockType } from '@wordpress/blocks';
import {
	Component,
	createElement,
	useEffect,
	useState,
} from '@wordpress/element';
import { __ } from './i18n';

import metadata from './block.json';
import './style.scss';

export type EditorFile = {
	name: string;
	contents: string;
	remoteUrl?: string;
};

export type Attributes = {
	codeEditor: boolean;
	codeEditorReadOnly: boolean;
	codeEditorSideBySide: boolean;
	codeEditorTranspileJsx: boolean;
	codeEditorMultipleFiles: boolean;
	codeEditorMode: string;
	logInUser: boolean;
	landingPageUrl: string;
	createNewPost: boolean;
	createNewPostType: string;
	createNewPostTitle: string;
	createNewPostContent: string;
	redirectToPost: boolean;
	redirectToPostType: string;
	blueprint: string;
	files?: EditorFile[];
	constants: Record<string, boolean | string | number>;
	codeEditorErrorLog: boolean;
	blueprintUrl: string;
	configurationSource:
		| 'block-attributes'
		| 'blueprint-url'
		| 'blueprint-json';
	requireLivePreviewActivation: boolean;
};

// Load the edit component asynchronously. This may take a while,
// and it seem to involve a few top-level async resolutions which
// delay the `registerBlockType()` call below when imported directly.
// As a result, the editor sometimes displays a "Block is not available" error.
// The dynamic import below is async and allows the registerBlockType()
// call to be synchronous, which allows the block to reliably load.
//
// The import is started on first render rather than at module scope. `./edit`
// pulls in the Playground client from playground.wordpress.net, so starting it
// here would download the whole editor bundle on every page that merely
// registers the block - including editors where no Playground block is ever
// inserted. Deferring it keeps `registerBlockType()` synchronous, which is what
// the note above is about, while only fetching when a block is actually edited.
let EditComponentPromise: Promise<typeof import('./edit')> | undefined;
let EditComponent: Component | undefined = undefined;

function loadEditComponent() {
	if (!EditComponentPromise) {
		EditComponentPromise = import('./edit');
		EditComponentPromise.then((module) => {
			EditComponent = module.default as any as Component;
		});
	}
	return EditComponentPromise;
}

// @ts-ignore
registerBlockType<Attributes>(metadata.name, {
	edit: (props) => {
		const [isLoaded, setIsLoaded] = useState(!!EditComponent);
		useEffect(() => {
			if (!isLoaded) {
				loadEditComponent().then(() => {
					setIsLoaded(true);
				});
			}
		}, []);
		if (!isLoaded) {
			return createElement('span', {}, [
				__('Loading the WordPress Playground Block...'),
			]);
		}
		return createElement(EditComponent as any, props);
	},
});
