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
import {
	useEffect,
	useRef,
	useState,
	createInterpolateElement,
} from '@wordpress/element';
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
import { __, _x, sprintf } from '../../i18n';
import { base64EncodeBlockAttributes, stringToBase64 } from '../../base64';

export type PlaygroundDemoProps = Attributes & {
	inBlockEditor: boolean;
	showAddNewFile: boolean;
	showFileControls: boolean;
	inFullPageView?: boolean;
	baseAttributesForFullPageView?: object;
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
	createNewPostTitle = _x(
		'New post',
		'default title of new post created by blueprint'
	),
	createNewPostContent = '',
	redirectToPost,
	redirectToPostType = 'front',
	landingPageUrl = '/',
	files: filesAttribute,
	showAddNewFile = false,
	showFileControls = false,
	codeEditorErrorLog = false,
	requireLivePreviewActivation = true,
	inFullPageView = false,
	baseAttributesForFullPageView = {},
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
	const beforePreviewRef = useRef<HTMLElement>(null);
	const afterPreviewRef = useRef<HTMLSpanElement>(null);
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

	const dismissedExitWithKeyboardTipKey =
		'playground-block-dismiss-exit-editor-tip';
	const [dismissedExitWithKeyboardTip, setDismissedExitWithKeyboardTip] =
		useState(localStorage[dismissedExitWithKeyboardTipKey] === 'true');
	function dismissExitWithKeyboardTip() {
		localStorage[dismissedExitWithKeyboardTipKey] = 'true';
		setDismissedExitWithKeyboardTip(true);

		// Shift focus to editor so focus is not lost as the tip disappears
		if (codeMirrorRef?.current?.view?.dom) {
			const contentEditableElement: HTMLElement =
				codeMirrorRef.current.view.dom.querySelector(
					'[contenteditable=true]'
				);
			if (contentEditableElement) {
				contentEditableElement.focus();
			}
		}
	}

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

	function getFullPageUrl(): string {
		// Use current URL as an easy-to-reach base URL
		const fullPageUrl = new URL(location.href);
		// But replace original query params so they cannot interfere
		fullPageUrl.search = '?playground-full-page';

		const fullPageAttributes = {
			...baseAttributesForFullPageView,
			// The action to open as full page can be considered activation.
			requireLivePreviewActivation: false,
			files: files.filter((f) => !isErrorLogFile(f)),
		};

		const encodedFullPageAttributes = stringToBase64(
			JSON.stringify(base64EncodeBlockAttributes(fullPageAttributes))
		);
		fullPageUrl.searchParams.append(
			'playground-attributes',
			encodedFullPageAttributes
		);

		return fullPageUrl.toString();
	}

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

	const mainContainerClass = classnames(
		'wordpress-playground-main-container',
		{
			'is-full-page-view': inFullPageView,
		}
	);
	const contentContainerClass = classnames(
		'wordpress-playground-content-container',
		{
			'is-one-under-another': !codeEditorSideBySide,
			'is-side-by-side': codeEditorSideBySide,
		}
	);
	const iframeCreationWarningForRunningCode = __(
		'This button runs the code in the Preview iframe. ' +
			'If the Preview iframe has not yet been activated, this ' +
			'button creates the Preview iframe which contains a full ' +
			'WordPress website and may be a challenge for screen readers.'
	);
	const iframeCreationWarningForActivation = __(
		'This button creates the Preview iframe containing a full ' +
			'WordPress website which may be a challenge for screen readers.'
	);

	return (
		<section
			aria-label={__('WordPress Playground')}
			className={mainContainerClass}
		>
			<header className="wordpress-playground-header">
				{!inBlockEditor && !inFullPageView && (
					<Button
						variant="link"
						className="wordpress-playground-header__full-page-link"
						onClick={() => {
							window.open(getFullPageUrl(), '_blank');
						}}
						aria-label={
							// Add dedicated aria-label for screen readers
							// because an arrow is added to the main button
							// label via CSS pseudo-element, and our users with
							// screen readers do not need an arrow read to them.
							__('Open in New Tab')
						}
					>
						{__('Open in New Tab')}
					</Button>
				)}
			</header>
			<div className={contentContainerClass}>
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
									<Spinner /> {__('Loading files...')}
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
										aria-label={
											codeEditorReadOnly ||
											isErrorLogFile(file)
												? sprintf(
														// translators: %s is a file name
														__(
															'Read-only file: %s'
														),
														file.name
												  )
												: sprintf(
														// translators: %s is a file name
														__('File: %s'),
														file.name
												  )
										}
										aria-current={
											index === activeFileIndex
												? 'true'
												: 'false'
										}
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
									aria-label={
										// translators: add source code file to code editor
										__('Add File')
									}
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
								aria-label={__('Download Code as a Zip file')}
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
						{!dismissedExitWithKeyboardTip && (
							<div>
								<div
									tabIndex={0}
									className="playground-block-exit-editor-tip"
									onClick={dismissExitWithKeyboardTip}
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											event.preventDefault();
											dismissExitWithKeyboardTip();
										}
									}}
								>
									{createInterpolateElement(
										// translators: This is a keyboard combination to exit the code editor.
										__(
											'Press <EscapeKey />, <TabKey /> to exit the editor.'
										),
										{
											EscapeKey: <code>Esc</code>,
											TabKey: <code>Tab</code>,
										}
									)}
									<Button variant="link">
										{__('Dismiss')}
									</Button>
								</div>
							</div>
						)}
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
								readOnly={
									codeEditorReadOnly ||
									isErrorLogFile(files[activeFileIndex])
								}
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
											<Icon icon={edit} />{' '}
											{
												// translators: edit source code file name
												__('Edit file name')
											}
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
												{
													// translators: remove file from code editor
													__('Remove file')
												}
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
										? iframeCreationWarningForRunningCode
										: undefined
								}
							>
								{
									// translators: verb: run code in Playground
									__('Run')
								}
							</Button>
						</div>
					</div>
				)}
				<div className="playground-container">
					{!inFullPageView && (
						<>
							<span
								className="screen-reader-text wordpress-playground-before-preview"
								tabIndex={-1}
								ref={beforePreviewRef}
							>
								{
									// translators: screen reader text noting beginning of the playground iframe
									__('Beginning of Playground Preview')
								}
							</span>
							<a
								href="#"
								className="screen-reader-text"
								onClick={(event) => {
									event.preventDefault();
									if (afterPreviewRef.current) {
										afterPreviewRef.current.focus();
									}
								}}
							>
								{
									// translators: verb: skip over the playground iframe
									__('Skip Playground Preview')
								}
							</a>
						</>
					)}
					{!isLivePreviewActivated && (
						<div className="playground-activation-placeholder">
							<Button
								className="wordpress-playground-activate-button"
								variant="primary"
								onClick={() => {
									setLivePreviewActivated(true);
									if (beforePreviewRef.current) {
										// For a11y, move focus to meaningful
										// "before preview" element before
										// focus is simply lost as this button
										// disappears.
										beforePreviewRef.current.focus();
									}
								}}
								aria-description={
									iframeCreationWarningForActivation
								}
							>
								{__('Activate Live Preview')}
							</Button>
						</div>
					)}
					{transpilationFailures?.length > 0 && (
						<div className="playground-transpilation-failures">
							<h3>{__('Transpilation Error')}</h3>
							<p>
								{__(
									'There were errors while transpiling the code. ' +
										'Please fix the errors and try again.'
								)}
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
							aria-label={__(
								'Live Preview in WordPress Playground'
							)}
							key="playground-iframe"
							ref={iframeRef}
							className="playground-iframe"
						></iframe>
					)}
					{!inFullPageView && (
						<span
							className="screen-reader-text wordpress-playground-end-of-preview"
							tabIndex={-1}
							ref={afterPreviewRef}
						>
							{
								// translators: screen reader text noting end of Playground preview
								__('End of Playground Preview')
							}
						</span>
					)}
				</div>
			</div>
			<footer className="wordpress-playground-footer">
				<a
					href="https://w.org/playground"
					className="wordpress-playground-footer__link"
					target="_blank"
					aria-label={
						// Provide dedicated ARIA label because NVDA does not
						// always spell out spaces as expected in the powered-by
						// HTML with the embedded icon.
						// Conversely, macOS Voiceover appears to disregard this
						// attribute when spelling out the link text.
						__('Powered by WordPress Playground')
					}
				>
					{createInterpolateElement(
						// translators: powered-by label with embedded icon. please leave markup tags intact, including numbering.
						__(
							'<span1>Powered by</span1><WordPressIcon /><span2>WordPress Playground</span2>'
						),
						{
							span1: (
								<span className="wordpress-playground-footer__powered" />
							),
							WordPressIcon: (
								<>
									{
										// a11y: Use non-breaking space because
										// macOS Voiceover does not otherwise
										// spell out the space in Safari.
										<span className="wordpress-playground-footer__spacing">
											&nbsp;
										</span>
									}
									<Icon
										icon={wordpress}
										className="wordpress-playground-footer__icon"
									/>
								</>
							),
							span2: (
								<span className="wordpress-playground-footer__link-text" />
							),
						}
					)}
				</a>
			</footer>
		</section>
	);
}
