import React from 'react';
import type { Attributes } from './index';
import type { BlockEditProps } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	ToggleControl,
	SelectControl,
	TextareaControl,
	Panel,
	PanelBody,
	// @ts-ignore
	__experimentalInputControl as InputControl,
	// @ts-ignore
	__experimentalToggleGroupControl as ToggleGroupControl,
	// @ts-ignore
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import PlaygroundPreview from './components/playground-preview';
import { __ } from '@wordpress/i18n';
import './editor.scss';

export default function Edit({
	isSelected,
	setAttributes,
	attributes,
}: BlockEditProps<Attributes>) {
	const {
		codeEditor,
		codeEditorReadOnly,
		codeEditorSideBySide,
		codeEditorMultipleFiles,
		codeEditorMode,
		logInUser,
		landingPageUrl,
		createNewPost,
		createNewPostType,
		createNewPostTitle,
		createNewPostContent,
		redirectToPost,
		redirectToPostType,
		constants,
		blueprint,
		codeEditorErrorLog,
		blueprintUrl,
		configurationSource,
		requireLivePreviewActivation,
	} = attributes;

	return (
		<div {...useBlockProps()}>
			<PlaygroundPreview
				showAddNewFile={codeEditorMultipleFiles}
				showFileControls={isSelected}
				onStateChange={({ files }) => {
					setAttributes({
						files,
					});
				}}
				{...attributes}
			/>
			<InspectorControls>
				<Panel header={__('Settings', 'interactive-code-editor')}>
					<PanelBody
						title={__('Code editor', 'interactive-code-editor')}
						initialOpen={true}
					>
						<ToggleControl
							label={__('Code editor', 'interactive-code-editor')}
							help={
								codeEditor
									? __('Code editor enabled.', 'interactive-code-editor')
									: __('Code editor disabled.', 'interactive-code-editor')
							}
							checked={codeEditor}
							onChange={() => {
								setAttributes({
									codeEditor: !codeEditor,
								});
							}}
						/>
						{codeEditor && (
							<>
								<ToggleControl
									label={__(
										'Side by side',
										'interactive-code-editor'
									)}
									help={
										codeEditorSideBySide
											? __('Code editor is to the left.', 'interactive-code-editor')
											: __('Code editor is at the top.', 'interactive-code-editor')
									}
									checked={codeEditorSideBySide}
									onChange={() => {
										setAttributes({
											codeEditorSideBySide:
												!codeEditorSideBySide,
										});
									}}
								/>
								<ToggleControl
									label={__(
										'Read only',
										'interactive-code-editor'
									)}
									help={
										codeEditorReadOnly
											? __('Code editor is read only.', 'interactive-code-block')
											: __('Code editor is editable.', 'interactive-code-block')
									}
									checked={codeEditorReadOnly}
									onChange={() => {
										setAttributes({
											codeEditorReadOnly:
												!codeEditorReadOnly,
										});
									}}
								/>
								<ToggleControl
									label={__(
										'Multiple files',
										'interactive-code-block'
									)}
									help={
										codeEditorMultipleFiles
											? __('Multiple files allowed.', 'interactive-code-block')
											: __('Single file allowed.', 'interactive-code-block')
									}
									checked={codeEditorMultipleFiles}
									onChange={() => {
										setAttributes({
											codeEditorMultipleFiles:
												!codeEditorMultipleFiles,
										});
									}}
								/>
								<ToggleControl
									label={__(
										'Require live preview activation',
										'interactive-code-block'
									)}
									help={
										requireLivePreviewActivation
											? __('User must click to load the preview.', 'interactive-code-block')
											: __('Preview begins loading immediately.', 'interactive-code-block')
									}
									checked={requireLivePreviewActivation}
									onChange={() => {
										setAttributes({
											requireLivePreviewActivation:
												!requireLivePreviewActivation,
										});
									}}
								/>
								<ToggleControl
									label={__(
										'Include "error_log" file',
										'interactive-code-block'
									)}
									checked={codeEditorErrorLog}
									onChange={() => {
										setAttributes({
											codeEditorErrorLog:
												!codeEditorErrorLog,
										});
									}}
								/>
								{/*
								Editor script mode breaks the preview

								The Editor script mode isn't a critical feature so the hidden div
								below is a UX workaround – we're simply hiding the select control
								to prevent the user from selecting the Editor script mode.

								@see https://github.com/WordPress/playground-tools/issues/196
								*/}
								<div style={{ display: 'none' }}>
									<SelectControl
										help={
											<div>
												Decide how your code from the
												editor will be used inside the
												Playground WordPress
												installation.
												<ul>
													<li>
														<strong>Plugin</strong>:
														all the files will be
														placed in a separate
														plugin which will be
														automatically enabled in
														the Playground.
													</li>
													<li>
														<strong>
															Editor script
														</strong>
														: the code will be
														executed directly in the
														Gutenberg editor (using{' '}
														<code>
															<small>
																wp_add_inline_script
															</small>
														</code>{' '}
														with{' '}
														<code>
															<small>
																wp-block
															</small>
														</code>
														dependency)
													</li>
												</ul>
											</div>
										}
										label={__(
											'Mode',
											'interactive-code-block'
										)}
										options={[
											{
												disabled: true,
												label: __(
													'Select an Option',
													'interactive-code-block'
												),
												value: '',
											},
											{
												label: __(
													'Editor script',
													'interactive-code-block'
												),
												value: 'editor-script',
											},
											{
												label: __(
													'Plugin',
													'interactive-code-block'
												),
												value: 'plugin',
											},
										]}
										value={codeEditorMode}
										onChange={(value) => {
											setAttributes({
												codeEditorMode: value,
											});
										}}
									/>
								</div>
							</>
						)}
					</PanelBody>
					<PanelBody
						title={__('Blueprint', 'interactive-code-block')}
						initialOpen={false}
					>
						<SelectControl
							label={__(
								'Blueprint source',
								'interactive-code-block'
							)}
							value={configurationSource}
							options={[
								{
									label: __(
										'Generate from block attributes',
										'interactive-code-block'
									),
									value: 'block-attributes',
								},
								{
									label: __('URL', 'interactive-code-block'),
									value: 'blueprint-url',
								},
								{
									label: __(
										'JSON (paste it below)',
										'interactive-code-block'
									),
									value: 'blueprint-json',
								},
							]}
							onChange={(newConfigurationSource) => {
								setAttributes({
									configurationSource: newConfigurationSource,
								});
							}}
							help={__(
								'Playground is configured using Blueprints. Select the source ' +
									"of the Blueprint you'd like to use for this Playground instance.",
								'interactive-code-block'
							)}
						/>
						{configurationSource === 'block-attributes' && (
							<>
								<ToggleControl
									label="Log in automatically"
									help={
										logInUser
											? __('User will be logged in.', 'interactive-code-block')
											: __("User won't be logged in.", 'interactive-code-block')
									}
									checked={logInUser}
									onChange={() => {
										setAttributes({
											logInUser: !logInUser,
										});
									}}
								/>
								<ToggleControl
									label={__(
										'Create new post or page',
										'interactive-code-block'
									)}
									help={
										createNewPost
											? __('New post or page will be created.', 'interactive-code-block')
											: __('No new posts or pages will be created.', 'interactive-code-block')
									}
									checked={createNewPost}
									onChange={() => {
										setAttributes({
											createNewPost: !createNewPost,
										});
									}}
								/>
								{createNewPost && (
									<>
										<ToggleGroupControl
											label={__(
												'Create new: post type',
												'interactive-code-block'
											)}
											value={createNewPostType}
											onChange={(value: any) => {
												setAttributes({
													createNewPostType:
														value?.toString(),
												});
											}}
											isBlock
										>
											<ToggleGroupControlOption
												value="post"
												label={__(
													'Post',
													'interactive-code-block'
												)}
											/>
											<ToggleGroupControlOption
												value="page"
												label={__(
													'Page',
													'interactive-code-block'
												)}
											/>
										</ToggleGroupControl>
										<InputControl
											value={createNewPostTitle}
											onChange={(value: any) => {
												setAttributes({
													createNewPostTitle: value,
												});
											}}
											label={__(
												'Create new: title',
												'interactive-code-block'
											)}
											placeholder={__(
												'Hello World!',
												'interactive-code-block'
											)}
										/>
										<TextareaControl
											value={createNewPostContent}
											onChange={(value) => {
												setAttributes({
													createNewPostContent: value,
												});
											}}
											label={__(
												'Create new: content',
												'interactive-code-block'
											)}
											help={__(
												'Gutenberg editor content of the post',
												'interactive-code-block'
											)}
										/>
										<ToggleControl
											label={__(
												'Create new: redirect to post',
												'interactive-code-block'
											)}
											help={
												redirectToPost
													? __('User will be redirected.', 'interactive-code-block')
													: __("User won't be redirected.", 'interactive-code-block')
											}
											checked={redirectToPost}
											onChange={() => {
												setAttributes({
													redirectToPost:
														!redirectToPost,
												});
											}}
										/>
										{redirectToPost && (
											<ToggleGroupControl
												label={__(
													'Create new redirect: redirect to',
													'interactive-code-block'
												)}
												value={redirectToPostType}
												onChange={(value: any) => {
													setAttributes({
														redirectToPostType:
															value?.toString(),
													});
												}}
												isBlock
											>
												<ToggleGroupControlOption
													value="front"
													label={__(
														'Front page',
														'interactive-code-block'
													)}
												/>
												<ToggleGroupControlOption
													value="admin"
													label={__(
														'Edit screen',
														'interactive-code-block'
													)}
												/>
											</ToggleGroupControl>
										)}
									</>
								)}
								{(!createNewPost || !redirectToPost) && (
									<InputControl
										value={landingPageUrl}
										onChange={(value: any) => {
											setAttributes({
												landingPageUrl: value,
											});
										}}
										label={__(
											'Landing page',
											'interactive-code-block'
										)}
										help={__(
											'Define where to redirect after Playground is loaded.',
											'interactive-code-block'
										)}
										placeholder={__(
											'URL to redirect to after load (eg. /wp-admin/)',
											'interactive-code-block'
										)}
									/>
								)}
								{['WP_DEBUG', 'WP_SCRIPT_DEBUG'].map(
									(constName) => (
										<ToggleControl
											key={constName}
											label={constName}
											help={
												constants[constName]
													? `${constName}=true`
													: `${constName}=false`
											}
											checked={!!constants[constName]}
											onChange={() => {
												setAttributes({
													constants: {
														...constants,
														[constName]:
															!constants[
																constName
															],
													},
												});
											}}
										/>
									)
								)}
							</>
						)}
						{configurationSource === 'blueprint-url' && (
							<InputControl
								value={blueprintUrl}
								onChange={(value: any) => {
									setAttributes({
										blueprintUrl: value,
									});
								}}
								label={__(
									'Blueprint URL',
									'interactive-code-block'
								)}
								help={__(
									'Load Blueprint from this URL.',
									'interactive-code-block'
								)}
								placeholder={__(
									'URL to load the Blueprint from',
									'interactive-code-block'
								)}
							/>
						)}
						{configurationSource === 'blueprint-json' && (
							<TextareaControl
								value={blueprint}
								onChange={(value) => {
									setAttributes({
										blueprint: value,
									});
								}}
								label={__(
									'Blueprint',
									'interactive-code-block'
								)}
								help={__(
									'JSON file with playground blueprint',
									'interactive-code-block'
								)}
							/>
						)}
					</PanelBody>
				</Panel>
			</InspectorControls>
		</div>
	);
}
