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
import {
	Modal,
	Button,
	__experimentalInputControl as InputControl,
} from '@wordpress/components';
import { Icon, plus, cancelCircleFilled, edit } from '@wordpress/icons';

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

	const [isEditFileNameModalOpen, setEditFileNameModalOpen] = useState(false);
	const [isNewFileModalOpen, setNewFileModalOpen] = useState(false);
	const [newFileName, setNewFileName] = useState('');

	const [currentFileIndex, setCurrentFileIndex] = useState(0);
	const [currentFileName, setCurrentFileName] = useState('');

	const currentFileExtension = currentFileName.split('.').pop();
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

		await client.mkdirTree('/wordpress/wp-content/plugins/demo-plugin');

		if (newFiles) {
			for (const file of newFiles) {
				await client.writeFile(
					`/wordpress/wp-content/plugins/demo-plugin/${file.name}`,
					file.file
				);
			}
		}

		await activatePlugin(client, {
			pluginName: 'Demo plugin',
			pluginPath: '/wordpress/wp-content/plugins/demo-plugin',
		});
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

			setLastInput(filesAttribute[currentFileIndex].file);
		}
	}, [filesAttribute]);

	useEffect(() => {
		async function initPlayground() {
			if (!iframeRef.current) {
				return;
			}

			const client = await startPlaygroundWeb({
				iframe: iframeRef.current,
				remoteUrl: 'https://playground.wordpress.net/remote.html',
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

			await handleCodeInjection(client, files);

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
	}, [playgroundClientRef.current, currentPostId, files]);

	return (
		<main className="demo-container">
			{codeEditor && (
				<div className="code-container">
					<div className="file-tabs">
						{files &&
							files.map((file, index) => (
								<button
									className={`file-tab wp-element-button ${
										index === currentFileIndex &&
										'file-tab-active'
									}`}
									onClick={() => {
										setCurrentFileIndex(index);
										setCurrentFileName(file.name);
										setLastInput(file.file);
									}}
								>
									{file.name}
								</button>
							))}
						{showAddNewFile && (
							<>
								<button
									className="file-tab file-tab-add-new wp-element-button"
									onClick={() => setNewFileModalOpen(true)}
								>
									<Icon icon={plus} />
								</button>
								{isNewFileModalOpen && (
									<Modal
										title="Create new file"
										onRequestClose={() =>
											setNewFileModalOpen(false)
										}
									>
										<InputControl
											placeholder="New file name"
											onChange={(value) => {
												if (value) {
													setNewFileName(value);
												}
											}}
										/>
										<br />
										<Button
											variant="primary"
											onClick={() => {
												addFile(newFileName, '');
												setNewFileModalOpen(false);
											}}
										>
											Create
										</Button>
									</Modal>
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
						<button
							onClick={() => {
								updateFileContent(currentFileIndex, lastInput);
							}}
							type="button"
							className="wp-element-button"
							disabled={!playgroundClientRef.current}
						>
							Save
						</button>
						{showFileControls && (
							<div className="file-actions">
								<button
									type="button"
									onClick={() =>
										setEditFileNameModalOpen(true)
									}
									className="playground-demo-button button-non-destructive"
								>
									<Icon icon={edit} /> Edit file name
								</button>
								{files.length > 1 && (
									<button
										type="button"
										className="playground-demo-button button-destructive"
										onClick={() => {
											setCurrentFileIndex(0);
											removeFile(currentFileIndex);
										}}
									>
										<Icon icon={cancelCircleFilled} />{' '}
										Remove file
									</button>
								)}
								{isEditFileNameModalOpen && (
									<Modal
										title="Edit file name"
										onRequestClose={() =>
											setEditFileNameModalOpen(false)
										}
									>
										<InputControl
											value={currentFileName}
											onChange={(value) => {
												if (value) {
													setCurrentFileName(value);
												}
											}}
										/>
										<br />
										<Button
											variant="primary"
											onClick={() => {
												updateFileName(
													currentFileIndex,
													currentFileName
												);
												setEditFileNameModalOpen(false);
											}}
										>
											Done
										</Button>
									</Modal>
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
