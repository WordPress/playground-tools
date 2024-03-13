import React, { useCallback, useMemo } from 'react';
import type { Attributes } from '../../index';
import ReactCodeMirror from '@uiw/react-codemirror';
import { keymap, EditorView } from '@codemirror/view';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { php } from '@codemirror/lang-php';
import {
	startPlaygroundWeb,
	type PlaygroundClient,
	phpVar,
	// @ts-ignore
} from 'https://playground.wordpress.net/client/index.js';
import { useEffect, useRef, useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import {
	Icon,
	plus,
	download,
	cancelCircleFilled,
	wordpress,
	edit,
} from '@wordpress/icons';
import { FileNameModal } from '../file-name-modal';
import useEditorFiles, { isErrorLogFile } from './use-editor-files';
import { LanguageSupport } from '@codemirror/language';
import { writePluginFiles } from './write-plugin-files';
import downloadZippedPlugin from './download-zipped-plugin';
import classnames from 'classnames';

export type PlaygroundDemoProps = Attributes & {
	showAddNewFile: boolean;
	showFileControls: boolean;
	onStateChange?: (state: any) => void;
};

const languages: Record<string, LanguageSupport> = {
	css: css(),
	html: html(),
	js: javascript(),
	jsx: javascript({ jsx: true }),
	json: json(),
	php: php(),
};

function getLanguageExtensions(extension: string) {
	return extension in languages ? [languages[extension]] : [];
}

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
		url.searchParams.delete('__playground_refresh');
	} else {
		url.searchParams.set('__playground_refresh', '1');
	}
	return url.pathname + url.search;
}

export default function PlaygroundPreview({
	blueprint,
	blueprintUrl,
	configurationSource,
	codeEditor,
	codeEditorSideBySide,
	codeEditorReadOnly,
	codeEditorMode,
	constants,
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
	codeEditorErrorLog = false,
	requireLivePreviewActivation = true,
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
	} = useEditorFiles(filesAttribute || [], {
		withErrorLog: codeEditorErrorLog,
		getErrors: async () =>
			(await playgroundClientRef.current?.readFileAsText(
				'/internal/stderr'
			)) || '',
	});

	const iframeRef = useRef<HTMLIFrameElement>(null);
	const playgroundClientRef = useRef<PlaygroundClient | null>(null);

	const [isLivePreviewActivated, setLivePreviewActivated] = useState(
		!requireLivePreviewActivation
	);
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
			if (!isLivePreviewActivated) {
				return;
			}
			if (!iframeRef.current) {
				return;
			}

			let finalBlueprint: any = undefined;
			try {
				if (configurationSource === 'blueprint-json') {
					if (blueprint) {
						finalBlueprint = JSON.parse(blueprint);
					}
				} else if (configurationSource === 'blueprint-url') {
					if (blueprintUrl) {
						finalBlueprint = await fetch(blueprintUrl).then((res) =>
							res.json()
						);
					}
				} else {
					finalBlueprint = {
						preferredVersions: {
							wp: 'latest',
							php: '7.4',
						},
						steps: [
							{
								step: 'defineWpConfigConsts',
								consts: constants,
							},
							logInUser && {
								step: 'login',
								username: 'admin',
								password: 'password',
							},
						],
					};
				}
			} catch (e) {
				console.error(e);
			}

			const configuration = {
				iframe: iframeRef.current,
				// wasm.wordpress.net is alias for playground.wordpress.net at the moment.
				// @TODO: Use playground.wordpress.net once the service worker
				//        is updated. The current one tries to serve the remote.html
				//        file from a /wp-6.4/ path when this block is used on
				//        playground.wordpress.net, and that returns a 404.html.
				remoteUrl: 'https://wasm.wordpress.net/remote.html',
			} as any;
			if (finalBlueprint) {
				configuration['blueprint'] = finalBlueprint;
			}
			console.log('Initializing Playground');
			const client = await startPlaygroundWeb(configuration);

			await client.isReady();
			playgroundClientRef.current = client;

			await reinstallEditedPlugin();

			if (configurationSource === 'block-attributes') {
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
				const redirectUrl = getLandingPageUrl(postId);
				await client.goTo(redirectUrl);
			} else if (!finalBlueprint) {
				await client.goTo('/');
			}
		}

		initPlayground();
	}, [
		isLivePreviewActivated,
		blueprint,
		blueprintUrl,
		configurationSource,
		logInUser,
		landingPageUrl,
		constants,
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

	async function reinstallEditedPlugin() {
		if (!playgroundClientRef.current) {
			return;
		}

		const client = playgroundClientRef.current;
		if (codeEditorMode === 'editor-script') {
			const docroot = await client.documentRoot;
			await client.writeFile(
				docroot + '/wp-content/mu-plugins/example-code.php',
				"<?php add_action('admin_init',function(){wp_add_inline_script('wp-blocks','" +
					activeFile.contents +
					"','after');});"
			);
		} else if (codeEditorMode === 'plugin' && codeEditor) {
			await writePluginFiles(client, files);
		}
	}

	const handleReRunCode = useCallback(() => {
		async function doHandleRun() {
			await reinstallEditedPlugin();

			// Refresh Playground iframe
			const lastPath = await playgroundClientRef.current!.getCurrentURL();
			await playgroundClientRef.current!.goTo(getRefreshPath(lastPath));
		}
		doHandleRun();
	}, [reinstallEditedPlugin]);

	const keymapExtension = useMemo(
		() =>
			keymap.of([
				{
					key: 'Mod-s',
					run() {
						handleReRunCode();
						return true;
					},
				},
			]),
		[handleReRunCode]
	);

	const codeContainerClass = classnames('code-container', {
		'is-full-width': !codeEditorSideBySide,
		'is-half-width': codeEditorSideBySide,
	});

	return (
		<>
			<main className="demo-container">
				{codeEditor && (
					<div className={codeContainerClass}>
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
									}}
									onDoubleClick={() => {
										setEditFileNameModalOpen(true);
									}}
								>
									{file.name}
								</Button>
							))}
							{showAddNewFile && (
								<Button
									variant="secondary"
									className="file-tab file-tab-extra"
									onClick={() => setNewFileModalOpen(true)}
								>
									<Icon icon={plus} />
								</Button>
							)}
							<Button
								variant="secondary"
								className="file-tab file-tab-extra"
								onClick={() => {
									if (playgroundClientRef.current) {
										downloadZippedPlugin(
											playgroundClientRef.current
										);
									}
								}}
							>
								<Icon icon={download} />
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
						</div>
						<div className="code-editor-wrapper">
							<ReactCodeMirror
								value={activeFile.contents}
								extensions={[
									keymapExtension,
									EditorView.lineWrapping,
									...getLanguageExtensions(
										currentFileExtension || 'js'
									),
								]}
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
									{!activeFile && (
										<button
											type="button"
											onClick={() => {
												setEditFileNameModalOpen(true);
											}}
											className="wordpress-playground-block-button button-non-destructive"
										>
											<Icon icon={edit} /> Edit file name
										</button>
									)}
									{!isErrorLogFile(activeFile) &&
										files.filter(
											(file) => !isErrorLogFile(file)
										).length > 1 && (
											<button
												type="button"
												className="wordpress-playground-block-button button-destructive"
												onClick={() => {
													setActiveFileIndex(0);
													removeFile(activeFileIndex);
												}}
											>
												<Icon
													icon={cancelCircleFilled}
												/>{' '}
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
									handleReRunCode();
								}}
								className="wordpress-playground-run-button"
							>
								Run
							</Button>
						</div>
					</div>
				)}
				{!isLivePreviewActivated && (
					<div className="playground-activation-placeholder">
						<Button
							className="wordpress-playground-activate-button"
							onClick={() => setLivePreviewActivated(true)}
						>
							Activate Live Preview
						</Button>
					</div>
				)}
				{isLivePreviewActivated && (
					<iframe
						key="playground-iframe"
						ref={iframeRef}
						className="playground-iframe"
					></iframe>
				)}
			</main>
			<footer className="demo-footer">
				<a
					href="https://w.org/playground"
					className="demo-footer__link"
					target="_blank"
				>
					<span className="demo-footer__powered">Powered by</span>
					<Icon className="demo-footer__icon" icon={wordpress} />
					<span className="demo-footer__link-text">
						WordPress Playground
					</span>
				</a>
			</footer>
		</>
	);
}
