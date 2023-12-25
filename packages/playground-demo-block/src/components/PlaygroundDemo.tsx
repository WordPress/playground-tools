import React from 'react';
import type { Attributes, File } from '../index';
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
import { useImmer } from 'use-immer';
import { useEffect, useRef, useState, useCallback } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { Icon, plus, cancelCircleFilled, edit } from '@wordpress/icons';
import { FileNameModal } from './FileNameModal';

export type PlaygroundDemoProps = Attributes & {
	showAddNewFile: boolean;
	showFileControls: boolean;
	onStateChange?: (state: any) => void;
};

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
	const [files, setFiles] = useImmer<File[]>([]);

	const languages = new Map([
		['js', javascript()],
		['jsx', javascript({ jsx: true })],
		['json', json()],
		['php', php()],
	]);

	const iframeRef = useRef<HTMLIFrameElement>(null);
	const playgroundClientRef = useRef<PlaygroundClient | null>(null);
	const [lastInput, setLastInput] = useState('');
	const [currentPostId, setCurrentPostId] = useState(0);

	const [isNewFileModalOpen, setNewFileModalOpen] = useState(false);
	const [isEditFileNameModalOpen, setEditFileNameModalOpen] = useState(false);

	const [activeFileIndex, setActiveFileIndex] = useState(0);

	const currentFileExtension = files?.[activeFileIndex]?.name
		?.split('.')
		.pop();
	const currentFileLanguage = currentFileExtension
		? languages.get(currentFileExtension)
		: javascript();
	const editorLanguage = currentFileLanguage ? [currentFileLanguage] : [];

	const updateFileName = useCallback((index: number, newName: string) => {
		setFiles((draft) => {
			draft[index].name = newName;
		});
	}, []);

	const updateFileContent = useCallback(
		(index: number, newContent: string) => {
			setFiles((draft) => {
				draft[index].file = newContent;
			});
		},
		[]
	);

	const removeFile = useCallback((index: number) => {
		setFiles((draft) => {
			draft.splice(index, 1);
		});
	}, []);

	const addFile = useCallback((name: string, content?: string) => {
		setFiles((draft) => {
			draft.push({
				name,
				file: content || '',
			});
		});
	}, []);

	const handleCodeInjection = async (
		client: PlaygroundClient,
		newFiles: File[]
	) => {
		if (codeEditorMode === 'editor-script') {
			await handleScriptInjection(client);
		} else if (codeEditorMode === 'plugin') {
			await handlePluginCreation(client, newFiles);
		}
	};

	const handleScriptInjection = async (client: PlaygroundClient) => {
		await client.writeFile(
			'/wordpress/wp-content/mu-plugins/example-code.php',
			"<?php add_action('admin_init',function(){wp_add_inline_script('wp-blocks','" +
				lastInput +
				"','after');});"
		);
	};

	const handlePluginCreation = async (
		client: PlaygroundClient,
		newFiles: File[]
	) => {
		if (!codeEditor) {
			return;
		}

		await client.mkdir('/wordpress/wp-content/plugins/demo-plugin');

		if (newFiles) {
			for (const file of newFiles) {
				await client.writeFile(
					`/wordpress/wp-content/plugins/demo-plugin/${file.name}`,
					file.file
				);
			}
		}

		try {
			await activatePlugin(client, {
				pluginPath: '/wordpress/wp-content/plugins/demo-plugin',
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
		if (filesAttribute) {
			setFiles(() => {
				return filesAttribute;
			});

			setLastInput(filesAttribute[activeFileIndex].file);
		}
	}, [filesAttribute]);

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
				const { text: newPostId } = await client.run({
					code: `<?php
						require("/wordpress/wp-load.php");

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
						{files?.map((file, index) => (
							<Button
								key={file.name}
								variant="primary"
								className={`file-tab ${
									index === activeFileIndex &&
									'file-tab-active'
								}`}
								onClick={() => {
									setActiveFileIndex(index);
									setLastInput(file.file);
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
											addFile(newFileName, '');
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
							extensions={[...editorLanguage]}
							readOnly={codeEditorReadOnly}
							onChange={(value) => {
								setLastInput(value);
							}}
						/>
					</div>
					<div className="actions-bar">
						<Button
							variant="primary"
							className="playground-demo-button"
							onClick={() => {
								updateFileContent(activeFileIndex, lastInput);
							}}
						>
							Save
						</Button>
						{showFileControls && (
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
										onSave={(newFileName) => {
											updateFileName(
												activeFileIndex,
												newFileName
											);
											setEditFileNameModalOpen(false);
										}}
									/>
								)}
							</div>
						)}
					</div>
				</div>
			)}
			<iframe ref={iframeRef} className="playground-iframe"></iframe>
		</main>
	);
}
