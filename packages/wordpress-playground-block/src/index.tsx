import { registerBlockType } from '@wordpress/blocks';
import { Button, PanelRow } from '@wordpress/components';
import {
	Component,
	createElement,
	useEffect,
	useState,
} from '@wordpress/element';
import {
	useSelect,
	useDispatch,
	subscribe,
	registerStore,
	register,
	createReduxStore,
} from '@wordpress/data';
import { PluginPrePublishPanel } from '@wordpress/edit-post';
import { registerPlugin } from '@wordpress/plugins';

import metadata from './block.json';
import './style.scss';

export type EditorFile = {
	name: string;
	contents: string;
};

export type Attributes = {
	codeEditor: boolean;
	codeEditorReadOnly: boolean;
	codeEditorSideBySide: boolean;
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
const EditComponentPromise = import('./edit');
let EditComponent: Component | undefined = undefined;
EditComponentPromise.then((module) => {
	EditComponent = module.default as any as Component;
});

// @ts-ignore
registerBlockType<Attributes>(metadata.name, {
	edit: (props) => {
		const [isLoaded, setIsLoaded] = useState(!!EditComponent);
		useEffect(() => {
			if (!isLoaded) {
				EditComponentPromise.then(() => {
					setIsLoaded(true);
				});
			}
		}, []);
		if (!isLoaded) {
			return createElement('span', {}, [
				'Loading the WordPress Playground Block...',
			]);
		}
		return createElement(EditComponent as any, props);
	},
});

const PrePublishFileUpload = () => {
	const [fileUploaded, setFileUploaded] = useState(false);
	const { lockPostSaving, unlockPostSaving } = useDispatch('core/editor');
	const isSavingPost = useSelect(
		(select) => select('core/editor').isSavingPost(),
		[]
	);
	console.log({ playgroundEditorClients: window.playgroundEditorClients });

	const handleFileUpload = (event: any) => {
		// Handle file upload logic here
		const file = event.target.files[0];
		// Perform file upload and set fileUploaded state accordingly
		setFileUploaded(true);
	};

	const handlePublish = () => {
		if (!fileUploaded) {
			lockPostSaving('pre_publish_file_upload');
		} else {
			unlockPostSaving('pre_publish_file_upload');
		}
	};

	const { isAutosavingPost } = useSelect(
		(select) => ({
			isAutosavingPost: select('core/editor').isAutosavingPost(),
		}),
		[]
	);

	// Dispatch file upload when an autosave happens
	useEffect(() => {
		if (isAutosavingPost) {
			// Save Playground zip
		}
	}, [isAutosavingPost]);

	return (
		<PluginPrePublishPanel
			title="File Upload"
			initialOpen={true}
			isEnabled={!isSavingPost}
		>
			<PanelRow>
				<input type="file" onChange={handleFileUpload} />
			</PanelRow>
			<PanelRow>
				<Button isPrimary onClick={handlePublish}>
					{fileUploaded ? 'Publish' : 'Upload File to Publish'}
				</Button>
			</PanelRow>
		</PluginPrePublishPanel>
	);
};

console.log({
	registerPlugin,
	PluginPrePublishPanel,
	PrePublishFileUpload,
	PanelRow,
	Button,
});

registerPlugin('pre-publish-file-upload', {
	render: PrePublishFileUpload,
});

const DEFAULT_STATE = { clients: [] };
const actions = {
	setClient(blockId, client) {
		return {
			type: 'SET_CLIENT',
			blockId,
			client,
		};
	},
};
const store = createReduxStore('my-shop', {
	reducer(state = DEFAULT_STATE, action) {
		switch (action.type) {
			case 'SET_CLIENT':
				return {
					...state,
					clients: {
						...state.clients,
						[action.blockId]: action.client,
					},
				};
		}

		return state;
	},

	actions,

	selectors: {
		getClients(state) {
			return state.clients;
		},
	},
});

register(store);
