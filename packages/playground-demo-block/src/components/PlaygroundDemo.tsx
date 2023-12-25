import React from 'react';
import type { Attributes, EditorFile } from '../index';
import ReactCodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { php } from '@codemirror/lang-php';
import {
	startPlaygroundWeb,
	login,
	PlaygroundClient,
} from '@wp-playground/client';
import { activatePlugin } from '@wp-playground/blueprints';
import { useEffect, useRef, useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { Icon, plus, cancelCircleFilled, edit } from '@wordpress/icons';
import { FileNameModal } from './FileNameModal';
import useEditorFiles from './useEditorFiles';
import { LanguageSupport } from '@codemirror/language';

export type PlaygroundDemoProps = Attributes & {
	showAddNewFile: boolean;
	showFileControls: boolean;
	onStateChange?: (state: any) => void;
};

const languages: Record<string, LanguageSupport> = {
	js: javascript(),
	jsx: javascript({ jsx: true }),
	json: json(),
	php: php(),
};

function getLanguageExtensions(extension: string) {
	return extension in languages ? [languages[extension]] : [];
}

export default function PlaygroundDemo({
	codeEditor,
	codeEditorReadOnly,
	codeEditorMode,
	logInUser,
	createNewPost,
	createNewPostType = 'post',
	createNewPostTitle = 'New post',
	createNewPostContent = '',
	redirectToPost,
	redirectToPostType = 'front',
	landingPageUrl = '/',
	files: filesAttribute,
	showAddNewFile = false,
	showFileControls = false,
	onStateChange,
}: PlaygroundDemoProps) {
	const {
		files,
		addFile,
		updateFile,
		removeFile,
		activeFile,
		activeFileIndex,
		setActiveFileIndex,
	} = useEditorFiles(filesAttribute || []);

	const iframeRef = useRef<HTMLIFrameElement>(null);
	const playgroundClientRef = useRef<PlaygroundClient | null>(null);
	const [lastInput, setLastInput] = useState(activeFile.contents || '');
	useEffect(() => {
		setLastInput(activeFile.contents);
	}, [activeFile.contents]);

	const [currentPostId, setCurrentPostId] = useState(0);
	const [isNewFileModalOpen, setNewFileModalOpen] = useState(false);
	const [isEditFileNameModalOpen, setEditFileNameModalOpen] = useState(false);

	const currentFileExtension = activeFile?.name.split('.').pop();

	const handleCodeInjection = async (
		client: PlaygroundClient,
		newFiles: EditorFile[]
	) => {
		if (codeEditorMode === 'editor-script') {
			await handleScriptInjection(client);
		} else if (codeEditorMode === 'plugin') {
			await handlePluginCreation(client, newFiles);
		}
	};

	const handleScriptInjection = async (client: PlaygroundClient) => {
		const docroot = await client.documentRoot;
		await client.writeFile(
			docroot + '/wp-content/mu-plugins/example-code.php',
			"<?php add_action('admin_init',function(){wp_add_inline_script('wp-blocks','" +
				lastInput +
				"','after');});"
		);
	};

	const handlePluginCreation = async (
		client: PlaygroundClient,
		newFiles: EditorFile[]
	) => {
		if (!codeEditor) {
			return;
		}

		const docroot = await client.documentRoot;

		await client.mkdir(docroot + '/wp-content/plugins/demo-plugin');

		if (newFiles) {
			for (const file of newFiles) {
				console.log({ file, newFiles });
				await client.writeFile(
					docroot + `/wp-content/plugins/demo-plugin/${file.name}`,
					file.contents
				);
			}
		}

		try {
			await activatePlugin(client, {
				pluginPath: docroot + '/wp-content/plugins/demo-plugin',
			});
		} catch (e) {
			console.error(e);
		}
	};

	const handleRedirect = async (client: PlaygroundClient, postId: number) => {
		if (createNewPost && redirectToPost) {
			if (redirectToPostType === 'front') {
				await client.goTo(`/?p=${postId}`);
				return;
			} else if (redirectToPostType === 'admin') {
				await client.goTo(
					`/wp-admin/post.php?post=${postId}&action=edit`
				);
				return;
			}
		}

		await client.goTo(landingPageUrl);
	};

	useEffect(() => {
		async function initPlayground() {
			if (!iframeRef.current) {
				return;
			}

			const client = await startPlaygroundWeb({
				iframe: iframeRef.current,
				// wasm.wordpress.net is alias for playground.wordpress.net at the moment.
				// @TODO: Use playground.wordpress.net once the service worker
				//        is updated. The current one tries to serve the remote.html
				//        file from a /wp-6.4/ path when this block is used on
				//        playground.wordpress.net, and that returns a 404.html.
				remoteUrl: 'https://wasm.wordpress.net/remote.html',
			});

			await client.isReady();

			playgroundClientRef.current = client;

			let postId = 0;

			if (createNewPost) {
				const docroot = await client.documentRoot;
				const { text: newPostId } = await client.run({
					code: `<?php
						require("${docroot}/wp-load.php");

						$post_id = wp_insert_post([
							'post_title' => '${createNewPostTitle}',
							'post_content' => '${createNewPostContent}',
							'post_status' => 'publish',
							'post_type' => '${createNewPostType}',
						]);

						echo $post_id;
					`,
				});

				setCurrentPostId(parseInt(newPostId));
				postId = parseInt(newPostId);
			}

			try {
				await handleCodeInjection(client, files);
			} catch (e) {
				console.error(e);
			}

			if (logInUser) {
				await login(client, {
					username: 'admin',
					password: 'password',
				});
			}

			await handleRedirect(client, postId);
		}

		initPlayground();
	}, [
		iframeRef.current,
		logInUser,
		landingPageUrl,
		createNewPost,
		createNewPostType,
		createNewPostTitle,
		createNewPostContent,
		redirectToPost,
		redirectToPostType,
	]);

	useEffect(() => {
		async function update() {
			if (!playgroundClientRef.current) {
				return;
			}

			if (!files) {
				return;
			}

			const client = playgroundClientRef.current;

			await handleCodeInjection(client, files);
			await handleRedirect(client, currentPostId);

			if (onStateChange) {
				onStateChange({
					client,
					postId: currentPostId,
					files,
				});
			}
		}

		update();
	}, [playgroundClientRef.current, currentPostId, JSON.stringify(files)]);

	return (
		<main className="demo-container">
			{codeEditor && (
				<div className="code-container">
					<div className="file-tabs">
						{files.map((file, index) => (
							<Button
								key={file.name}
								variant="primary"
								className={`file-tab ${
									index === activeFileIndex &&
									'file-tab-active'
								}`}
								onClick={() => {
									setActiveFileIndex(index);
									setLastInput(file.contents);
								}}
								onDoubleClick={() => {
									setEditFileNameModalOpen(true);
								}}
							>
								{file.name}
							</Button>
						))}
						{showAddNewFile && (
							<>
								<Button
									variant="secondary"
									className="file-tab file-tab-add-new"
									onClick={() => setNewFileModalOpen(true)}
								>
									<Icon icon={plus} />
								</Button>
								{isNewFileModalOpen && (
									<FileNameModal
										title="Create new file"
										onRequestClose={() =>
											setNewFileModalOpen(false)
										}
										onSave={(newFileName) => {
											addFile({
												name: newFileName,
												contents: '',
											});
											setActiveFileIndex(files.length);
											setNewFileModalOpen(false);
										}}
									/>
								)}
							</>
						)}
					</div>
					<div className="code-editor-wrapper">
						<ReactCodeMirror
							value={lastInput}
							extensions={getLanguageExtensions(
								currentFileExtension || 'js'
							)}
							readOnly={codeEditorReadOnly}
							onChange={(value) => {
								setLastInput(value);
							}}
						/>
					</div>
					<div className="actions-bar">
						{showFileControls ? (
							<div className="file-actions">
								<button
									type="button"
									onClick={() => {
										setEditFileNameModalOpen(true);
									}}
									className="playground-demo-button button-non-destructive"
								>
									<Icon icon={edit} /> Edit file name
								</button>
								{files.length > 1 && (
									<button
										type="button"
										className="playground-demo-button button-destructive"
										onClick={() => {
											setActiveFileIndex(0);
											removeFile(activeFileIndex);
										}}
									>
										<Icon icon={cancelCircleFilled} />{' '}
										Remove file
									</button>
								)}
								{isEditFileNameModalOpen && (
									<FileNameModal
										title="Edit file name"
										initialFilename={
											files[activeFileIndex].name
										}
										onRequestClose={() =>
											setEditFileNameModalOpen(false)
										}
										onSave={(fileName) => {
											updateFile((file) => ({
												...file,
												name: fileName,
											}));
											setEditFileNameModalOpen(false);
										}}
									/>
								)}
							</div>
						) : (
							<div className="file-actions"></div>
						)}
						<Button
							variant="primary"
							className="playground-demo-button"
							onClick={() => {
								updateFile((file) => ({
									...file,
									contents: lastInput,
								}));
							}}
						>
							Save
						</Button>
					</div>
				</div>
			)}
			<iframe ref={iframeRef} className="playground-iframe"></iframe>
		</main>
	);
}
