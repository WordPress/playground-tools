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
	phpVar,
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

const writePluginFiles = async (
	client: PlaygroundClient,
	files: EditorFile[]
) => {
	const docroot = await client.documentRoot;
	const pluginPath = docroot + '/wp-content/plugins/demo-plugin';
	if (await client.fileExists(pluginPath)) {
		await client.rmdir(pluginPath, {
			recursive: true,
		});
	}
	await client.mkdir(pluginPath);

	for (const file of files) {
		const filePath = `${pluginPath}/${file.name}`;
		const parentDir = filePath.split('/').slice(0, -1).join('/');
		await client.mkdir(parentDir);
		await client.writeFile(filePath, file.contents);
	}

	try {
		await activatePlugin(client, {
			pluginPath,
		});
	} catch (e) {
		console.error(e);
	}
};

/**
 * Playground's `goTo` method doesn't work when the URL is the same as the
 * current URL. This function returns a URL that is the same as the given URL,
 * but with a `__playground_refresh` query parameter added or removed to
 * force a refresh.
 *
 * @param lastPath
 * @returns
 */
function getRefreshPath(lastPath: string) {
	const url = new URL(lastPath, 'https://playground.wordpress.net');
	if (url.searchParams.has('__playground_refresh')) {
		url.searchParams.delete('__playground_refresh', '1');
	} else {
		url.searchParams.set('__playground_refresh', '1');
	}
	return url.pathname + url.search;
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
	const [lastPath, setLastUrl] = useState(landingPageUrl);

	const [currentPostId, setCurrentPostId] = useState(0);
	const [isNewFileModalOpen, setNewFileModalOpen] = useState(false);
	const [isEditFileNameModalOpen, setEditFileNameModalOpen] = useState(false);

	/**
	 * Let the parent component know when the state changes.
	 */
	useEffect(() => {
		onStateChange?.({
			client: playgroundClientRef.current,
			postId: currentPostId,
			files,
		});
	}, [playgroundClientRef.current, currentPostId, files]);

	const currentFileExtension = activeFile?.name.split('.').pop();

	useEffect(() => {
		async function initPlayground() {
			if (!iframeRef.current) {
				return;
			}

			console.log('Initializing Playground');
			const client = await startPlaygroundWeb({
				iframe: iframeRef.current,
				// wasm.wordpress.net is alias for playground.wordpress.net at the moment.
				// @TODO: Use playground.wordpress.net once the service worker
				//        is updated. The current one tries to serve the remote.html
				//        file from a /wp-6.4/ path when this block is used on
				//        playground.wordpress.net, and that returns a 404.html.
				remoteUrl: 'https://wasm.wordpress.net/remote.html',
				blueprint: {
					constants: {
						// WP_DEBUG: 'true'
					}
				}
			});

			await client.isReady();
			playgroundClientRef.current = client;

			// Keeps track of the last URL that was loaded in the iframe.
			// @TODO: Fix client.getCurrentURL() and use that instead.
			client.onNavigation((url) => {
				console.log({ url });
				setLastUrl(url);
			});

			let postId = 0;
			if (createNewPost) {
				const docroot = await client.documentRoot;
				const { text: newPostId } = await client.run({
					code: `<?php
						require("${docroot}/wp-load.php");

						$post_id = wp_insert_post([
							'post_title' => ${phpVar(createNewPostTitle)},
							'post_content' => ${phpVar(createNewPostContent)},
							'post_status' => 'publish',
							'post_type' => ${phpVar(createNewPostType)},
						]);

						echo $post_id;
					`,
				});

				setCurrentPostId(parseInt(newPostId));
				postId = parseInt(newPostId);
			}

			if (logInUser) {
				await login(client, {
					username: 'admin',
					password: 'password',
				});
			}

			await reinstallCode();

			const redirectUrl = getLandingPageUrl(postId);
			setLastUrl(redirectUrl);
			await client.goTo(redirectUrl);
		}

		initPlayground();
	}, [
		logInUser,
		landingPageUrl,
		createNewPost,
		createNewPostType,
		createNewPostTitle,
		createNewPostContent,
		redirectToPost,
		redirectToPostType,
	]);

	function getLandingPageUrl(postId: number = currentPostId) {
		if (createNewPost && redirectToPost) {
			if (redirectToPostType === 'front') {
				return `/?p=${postId}`;
			} else if (redirectToPostType === 'admin') {
				return `/wp-admin/post.php?post=${postId}&action=edit`;
			}
		}
		return landingPageUrl;
	}

	async function reinstallCode() {
		if (!playgroundClientRef.current) {
			return;
		}

		const client = playgroundClientRef.current;
		const docroot = await client.documentRoot;
		if (codeEditorMode === 'editor-script') {
			await client.writeFile(
				docroot + '/wp-content/mu-plugins/example-code.php',
				"<?php add_action('admin_init',function(){wp_add_inline_script('wp-blocks','" +
					lastInput +
					"','after');});"
			);
		} else if (codeEditorMode === 'plugin' && codeEditor) {
			await writePluginFiles(client, files);
		}
	}

	async function refreshPlayground() {
		await playgroundClientRef.current!.goTo(getRefreshPath(lastPath));
	}

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
							value={activeFile.contents}
							extensions={getLanguageExtensions(
								currentFileExtension || 'js'
							)}
							readOnly={codeEditorReadOnly}
							onChange={(value) =>
								updateFile((file) => ({
									...file,
									contents: value,
								}))
							}
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
							icon="controls-play"
							iconPosition="right"
							onClick={() => {
								reinstallCode().then(refreshPlayground);
							}}
							className="playground-demo-button"
						>
							Run
						</Button>
					</div>
				</div>
			)}
			<iframe
				key="playground-iframe"
				ref={iframeRef}
				className="playground-iframe"
			></iframe>
		</main>
	);
}
