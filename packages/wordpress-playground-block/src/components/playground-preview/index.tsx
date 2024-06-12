import { useCallback, useMemo } from 'react';
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
import { Button, Spinner } from '@wordpress/components';
import {
	Icon,
	plus,
	download,
	cancelCircleFilled,
	wordpress,
	edit,
	link,
} from '@wordpress/icons';
import useEditorFiles, { isErrorLogFile } from './use-editor-files';
import { LanguageSupport } from '@codemirror/language';
import { writePluginFiles } from './write-plugin-files';
import downloadZippedPlugin from './download-zipped-plugin';
import classnames from 'classnames';
import FileManagementModals, { FileManagerRef } from './file-management-modals';
import {
	TranspilationFailure,
	transpilePluginFiles,
} from './transpile-plugin-files';

export type PlaygroundDemoProps = Attributes & {
	inBlockEditor: boolean;
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
	inBlockEditor,
	blueprint,
	blueprintUrl,
	configurationSource,
	codeEditor,
	codeEditorSideBySide,
	codeEditorReadOnly,
	codeEditorTranspileJsx,
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
		isLoading: isFilesLoading,
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
	const fileMgrRef = useRef<FileManagerRef>(null);
	const codeMirrorRef = useRef<any>(null);

	/**
	 * Prevent the CodeMirror keyboard shortcuts from leaking to the block editor.
	 */
	useEffect(() => {
		if (!codeMirrorRef.current) return;

		const view = codeMirrorRef.current.view;
		if (!view) return;

		function stopPropagation(event: KeyboardEvent) {
			event.stopPropagation();
		}
		view.dom.addEventListener('keydown', stopPropagation);
		view.dom.addEventListener('keypress', stopPropagation);
		view.dom.addEventListener('keyup', stopPropagation);
		return () => {
			view.dom.removeEventListener('keydown', stopPropagation, true);
			view.dom.removeEventListener('keyup', stopPropagation, true);
			view.dom.removeEventListener('keypress', stopPropagation, true);
		};
	}, [codeMirrorRef.current]);

	const [isLivePreviewActivated, setLivePreviewActivated] = useState(
		!requireLivePreviewActivation
	);
	const [currentPostId, setCurrentPostId] = useState(0);

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

	const [transpilationFailures, setTranspilationFailures] = useState<
		TranspilationFailure[]
	>([]);
	async function reinstallEditedPlugin() {
		if (!playgroundClientRef.current || !codeEditor) {
			return;
		}

		setTranspilationFailures([]);

		const client = playgroundClientRef.current;
		let finalFiles = files;
		if (codeEditorTranspileJsx) {
			const { failures, transpiledFiles } = await transpilePluginFiles(
				finalFiles
			);
			if (failures.length) {
				for (const failure of failures) {
					console.error(
						`Failed to transpile ${failure.file.name}:`,
						failure.error
					);
				}
				setTranspilationFailures(failures);
				return;
			}
			finalFiles = transpiledFiles;
		}
		await writePluginFiles(client, finalFiles);
	}

	const handleReRunCode = useCallback(() => {
		async function doHandleRun() {
			await reinstallEditedPlugin();

			// Refresh Playground iframe
			const lastPath = await playgroundClientRef.current!.getCurrentURL();
			await playgroundClientRef.current!.goTo(getRefreshPath(lastPath));
		}

		if (!isLivePreviewActivated) {
			// Activate and let the code be run by Playground init
			setLivePreviewActivated(true);
		} else {
			doHandleRun();
		}
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

	const mainContainerClass = classnames('demo-container', {
		'is-one-under-another': !codeEditorSideBySide,
		'is-side-by-side': codeEditorSideBySide,
	});
	const iframeCreationWarning =
		'This button creates an iframe containing a full WordPress website ' +
		'which may be a challenge for screen readers.';

	return (
		<>
			<section
				aria-label="WordPress Playground"
				className={mainContainerClass}
			>
				{codeEditor && (
					<div className="code-container">
						<FileManagementModals
							ref={fileMgrRef}
							updateFile={updateFile}
							addFile={addFile}
							setActiveFileIndex={setActiveFileIndex}
							files={files}
							activeFileIndex={activeFileIndex}
						/>
						<div className="file-tabs">
							{isFilesLoading ? (
								<div className="file-tab file-tab-loading">
									<Spinner /> Loading files...
								</div>
							) : (
								files.map((file, index) => (
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
											fileMgrRef.current?.setEditFileNameModalOpen(
												true
											);
										}}
									>
										{inBlockEditor && file.remoteUrl ? (
											<Icon icon={link} />
										) : (
											''
										)}
										{file.name}
									</Button>
								))
							)}
							{showAddNewFile && (
								<Button
									variant="secondary"
									className="file-tab file-tab-extra"
									onClick={() =>
										fileMgrRef.current?.setNewFileModalOpen(
											true
										)
									}
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
						</div>
						<div className="code-editor-wrapper">
							<ReactCodeMirror
								ref={codeMirrorRef}
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
												fileMgrRef.current?.setEditFileNameModalOpen(
													true
												);
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
								aria-description={
									requireLivePreviewActivation
										? iframeCreationWarning
										: undefined
								}
							>
								Run
							</Button>
						</div>
					</div>
				)}
				<div className="playground-container">
					{!isLivePreviewActivated && (
						<div className="playground-activation-placeholder">
							<Button
								className="wordpress-playground-activate-button"
								variant="primary"
								onClick={() => setLivePreviewActivated(true)}
								aria-description={iframeCreationWarning}
							>
								Activate Live Preview
							</Button>
						</div>
					)}
					{transpilationFailures?.length > 0 && (
						<div className="playground-transpilation-failures">
							<h3>Transpilation Error</h3>
							<p>
								There were errors while transpiling the code.
								Please fix the errors and try again.
							</p>
							<ul>
								{transpilationFailures.map(
									({ file, error }) => (
										<li key={file.name}>
											<b>{file.name}</b>
											<p>{error.message}</p>
										</li>
									)
								)}
							</ul>
						</div>
					)}
					{isLivePreviewActivated && (
						<iframe
							aria-label="Live Preview in WordPress Playground"
							key="playground-iframe"
							ref={iframeRef}
							className="playground-iframe"
						></iframe>
					)}
				</div>
			</section>
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
