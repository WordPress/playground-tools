import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
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
};

// @ts-ignore
registerBlockType<Attributes>(metadata.name, {
	edit: Edit,
});
