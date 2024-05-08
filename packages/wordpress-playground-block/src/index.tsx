import { registerBlockType } from '@wordpress/blocks';
import { Button, PanelRow } from '@wordpress/components';
import {
	Component,
	createElement,
	useEffect,
	useState,
} from '@wordpress/element';
import { useSelect, register, useDispatch } from '@wordpress/data';
import { PluginPrePublishPanel } from '@wordpress/edit-post';
import { store as editorStore } from '@wordpress/editor';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { registerPlugin } from '@wordpress/plugins';
import apiFetch from '@wordpress/api-fetch';

import metadata from './block.json';
import './style.scss';
import { PlaygroundClientDetails, store } from './store';

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
	shapshotMediaId?: number;
	shapshotMediaUrl?: string;
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

const playgroundClientLibrary = import('https://playground.wordpress.net/client/index.js');
const PlaygroundPrePublish = () => {
	const { clientsDetails, blockNames } = useSelect((select) => {
		const clientsDetails = select(store).getClientsDetails();
		const blocks = select(editorStore).getBlocksByClientId(
			Object.keys(clientsDetails)
		);
		const blockNames: Record<string, string> = {};
		for (const block of blocks) {
			blockNames[block.clientId] =
				block?.attributes?.metadata?.name || metadata.title;
		}

		return {
			clientsDetails,
			blockNames,
		};
	}, []);

	const { setUploadStatus } = useDispatch(store);
	const { updateBlockAttributes } = useDispatch(blockEditorStore);

	// const [fileUploaded, setFileUploaded] = useState(false);
	// const { lockPostSaving, unlockPostSaving } = useDispatch('core/editor');

	const handleUpload = async () => {
		await Promise.all(
			Object.entries(clientsDetails).map(async ([clientId, details]) => {
				if (!details.client) {
					return;
				}
				return handleSingleUpload(clientId, details);
			})
		);
	};

	async function handleSingleUpload(blockId: string, { client }: PlaygroundClientDetails) {
		await setUploadStatus(blockId, 'uploading');
		const { zipWpContent } = await playgroundClientLibrary;
		const bytes = await zipWpContent(client, {
			selfContained: false,
		});
		const file = new File([bytes], 'wordpress-playground.zip');

		const formData = new FormData();
        formData.append('file', file);
        formData.append('action', 'wp_handle_upload'); // This is optional depending on your implementation

		try {
			const response = await apiFetch({
				path: '/wp/v2/media',
				method: 'POST',
				headers: {
					'Content-Disposition': 'attachment; filename="' + file.name + '"'
				},
				body: formData,
				parse: false,  // Important to prevent apiFetch from parsing FormData body
			}) as any;
			const json = await response.json();
			await setUploadStatus(blockId, 'uploaded');
			await updateBlockAttributes(blockId, {
				shapshotMediaId: json.id,
				shapshotMediaUrl: json.source_url,
			});
		} catch (error) {
			await setUploadStatus(blockId, 'error');
			console.error('Error creating media attachment:', error);
		}
	}

	// const handleUpload = () => {
	// 	if (!fileUploaded) {
	// 		lockPostSaving('pre_publish_file_upload');
	// 	} else {
	// 		unlockPostSaving('pre_publish_file_upload');
	// 	}
	// };

	// const { isAutosavingPost } = useSelect(
	// 	(select) => ({
	// 		isAutosavingPost: select('core/editor').isAutosavingPost(),
	// 	}),
	// 	[]
	// );

	// // Dispatch file upload when an autosave happens
	// useEffect(() => {
	// 	if (isAutosavingPost) {
	// 		// Save Playground zip
	// 	}
	// }, [isAutosavingPost]);

	return (
		<PluginPrePublishPanel
			title="Playgrounds to export"
			initialOpen={true}
			isEnabled={true}
		>
			<PanelRow>
				<p>
					The following Playground blocks are ready to be exported as a ZIP:
				</p>
			</PanelRow>
			{Object.entries(clientsDetails).map(
				([clientId, { uploadStatus }], idx) => (
					<PanelRow>
						<div key={clientId}>
							{idx + 1}. {blockNames[clientId]} - {uploadStatus}
						</div>
					</PanelRow>
				)
			)}
			<PanelRow>
				<Button isPrimary onClick={handleUpload}>
					Upload as ZIP
				</Button>
			</PanelRow>
		</PluginPrePublishPanel>
	);
};

console.log({
	registerPlugin,
	PluginPrePublishPanel,
	PrePublishFileUpload: PlaygroundPrePublish,
	PanelRow,
	Button,
});

registerPlugin('playground-pre-publish', {
	render: PlaygroundPrePublish,
});

register(store);
