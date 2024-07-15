import React from 'react';
import type { Attributes } from './index';
import type { BlockEditProps } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { useState, useRef } from '@wordpress/element';
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
import './editor.scss';
import {
	attributesToBase64,
	base64DecodeBlockAttributes,
	base64EncodeBlockAttributes,
} from './base64';
import { __, _x } from './i18n';

/**
 * Some WordPress installations are overly eager with their HTML entity encoding
 * and will save `<?php` as `&lt;php`. We cannot easily detect this to decode
 * these HTML entities only when needed, so let's just store the attributes using
 * base64 encoding to prevent WordPress from breaking them.
 */
function withBase64Attrs(Component: any) {
	return (props: any) => {
		const ref = useRef<any>({
			encodeTimeout: null,
		});
		// Store the base64 encoded attributes are stored in a local state in a
		// decoded form to avoid encoding/decoding on each keystroke.
		const [base64Attributes, setBase64Attributes] = useState<
			Record<string, any>
		>(() => {
			const attrs: Record<string, any> = {};
			for (const key in props.attributes) {
				if (attributesToBase64.includes(key)) {
					attrs[key] = props.attributes[key];
				}
			}
			return base64DecodeBlockAttributes(attrs);
		});
		// Pass the non-base64 attributes to the component as they are on each
		// render.
		const nonBase64Attributes: Record<string, any> = {};
		for (const key in props.attributes) {
			if (!attributesToBase64.includes(key)) {
				nonBase64Attributes[key] = props.attributes[key];
			}
		}

		/**
		 * Store the base64 encoded attributes in the local state instead of
		 * calling setAttributes() on each change. Then, debounce the actual
		 * setAttributes() call to prevent encoding/decoding/re-render on each
		 * key stroke.
		 *
		 * Other attributes are just passed to props.setAttributes().
		 */
		function setAttributes(attributes: any) {
			const deltaBase64Attributes: Record<string, string> = {};
			const deltaRest: Record<string, string> = {};
			for (const key in attributes) {
				if (attributesToBase64.includes(key)) {
					deltaBase64Attributes[key] = attributes[key];
				} else {
					deltaRest[key] = attributes[key];
				}
			}
			if (Object.keys(deltaRest).length > 0) {
				props.setAttributes(deltaRest);
			}

			const newBase64Attributes: Record<string, any> = {
				...base64Attributes,
				...deltaBase64Attributes,
			};
			if (Object.keys(deltaBase64Attributes).length > 0) {
				setBase64Attributes(newBase64Attributes);
			}

			// Debounce the encoding to prevent encoding/decoding/re-render on
			// each key stroke.
			if (ref.current.encodeTimeout) {
				clearTimeout(ref.current.encodeTimeout);
			}
			ref.current.encodeTimeout = setTimeout(() => {
				props.setAttributes(
					base64EncodeBlockAttributes(newBase64Attributes)
				);
				clearTimeout(ref.current.encodeTimeout);
				ref.current.encodeTimeout = null;
			}, 100);
		}

		return (
			<Component
				{...props}
				setAttributes={setAttributes}
				attributes={{
					...nonBase64Attributes,
					...base64Attributes,
				}}
			/>
		);
	};
}

export default withBase64Attrs(function Edit({
	isSelected,
	setAttributes,
	attributes,
}: BlockEditProps<Attributes>) {
	const {
		codeEditor,
		codeEditorReadOnly,
		codeEditorTranspileJsx,
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
				inBlockEditor
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
				<Panel header={__('Settings')}>
					<PanelBody title={__('General')} initialOpen={true}>
						<ToggleControl
							label={__('Require live preview activation')}
							help={
								requireLivePreviewActivation
									? __('User must click to load the preview.')
									: __('Preview begins loading immediately.')
							}
							checked={requireLivePreviewActivation}
							onChange={() => {
								setAttributes({
									requireLivePreviewActivation:
										!requireLivePreviewActivation,
								});
							}}
						/>
					</PanelBody>
					<PanelBody title={__('Code editor')} initialOpen={true}>
						<ToggleControl
							label={__('Code editor')}
							help={
								codeEditor
									? __('Code editor enabled.')
									: __('Code editor disabled.')
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
									label={__('Side by side')}
									help={
										codeEditorSideBySide
											? __('Code editor is to the left.')
											: __('Code editor is at the top.')
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
									label={__('Read only')}
									help={
										codeEditorReadOnly
											? __('Code editor is read only.')
											: __('Code editor is editable.')
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
									label={__('Transpile JSX to JS')}
									help={__(
										`Transpiles JSX syntax to JS using esbuild. Only the JSX tags are ` +
											`transpiled. Imports and other advanced ES module syntax features are ` +
											`preserved.`
									)}
									checked={codeEditorTranspileJsx}
									onChange={() => {
										setAttributes({
											codeEditorTranspileJsx:
												!codeEditorTranspileJsx,
										});
									}}
								/>
								<ToggleControl
									label={__('Multiple files')}
									help={
										codeEditorMultipleFiles
											? __('Multiple files allowed.')
											: __('Single file allowed.')
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
									label={__('Include "error_log" file')}
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
								@todo Before re-enabling, add i18n support.
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
										label="Mode"
										options={[
											{
												disabled: true,
												label: 'Select an Option',
												value: '',
											},
											{
												label: 'Editor script',
												value: 'editor-script',
											},
											{
												label: 'Plugin',
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
					<PanelBody title={__('Blueprint')} initialOpen={false}>
						<SelectControl
							label={__('Blueprint source')}
							value={configurationSource}
							options={[
								{
									label: __(
										'Generate from block attributes',
										'source of Blueprint content'
									),
									value: 'block-attributes',
								},
								{
									label: _x(
										'URL',
										'source of Blueprint content'
									),
									value: 'blueprint-url',
								},
								{
									label: _x(
										'JSON (paste it below)',
										'source of Blueprint content'
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
									"of the Blueprint you'd like to use for this Playground instance."
							)}
						/>
						{configurationSource === 'block-attributes' && (
							<>
								<ToggleControl
									label={__('Log in automatically')}
									help={
										logInUser
											? __('User will be logged in.')
											: __("User won't be logged in.")
									}
									checked={logInUser}
									onChange={() => {
										setAttributes({
											logInUser: !logInUser,
										});
									}}
								/>
								<ToggleControl
									label={__('Create new post or page')}
									help={
										createNewPost
											? __(
													'New post or page will be created.'
											  )
											: __(
													'No new posts or pages will be created.'
											  )
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
											label={_x(
												'Create new: post type',
												'optional blueprint step'
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
												label={_x(
													'Post',
													'noun: WordPress post type'
												)}
											/>
											<ToggleGroupControlOption
												value="page"
												label={_x(
													'Page',
													'noun: WordPress post type'
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
											label={_x(
												'Create new: title',
												'title for new post or page created by blueprint'
											)}
											placeholder={_x(
												'Hello World!',
												'placeholder text: ' +
													'title for new post or page created by blueprint'
											)}
										/>
										<TextareaControl
											value={createNewPostContent}
											onChange={(value) => {
												setAttributes({
													createNewPostContent: value,
												});
											}}
											label={_x(
												'Create new: content',
												'content for new post or page created by blueprint'
											)}
											help={__(
												'Gutenberg editor content of the post'
											)}
										/>
										<ToggleControl
											label={_x(
												'Create new: redirect to post',
												'optional blueprint step'
											)}
											help={
												redirectToPost
													? __(
															'User will be redirected.'
													  )
													: __(
															"User won't be redirected."
													  )
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
												label={
													// translators: how to redirect to post created by blueprint
													__(
														'Create new redirect: redirect to'
													)
												}
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
													label={
														// translators: place to view the post created by blueprint
														_x(
															'Front page',
															'post created by blueprint'
														)
													}
												/>
												<ToggleGroupControlOption
													value="admin"
													label={
														// translators: place to edit the post created by blueprint
														_x(
															'Edit screen',
															'post created by blueprint'
														)
													}
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
										label={_x(
											'Landing page',
											'where to redirect after Playground is loaded'
										)}
										help={__(
											'Define where to redirect after Playground is loaded.'
										)}
										placeholder={__(
											'URL to redirect to after load (eg. /wp-admin/)'
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
								label={__('Blueprint URL')}
								help={__('Load Blueprint from this URL.')}
								placeholder={__(
									'URL to load the Blueprint from'
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
								label={_x('Blueprint', 'raw Blueprint JSON')}
								help={__('JSON file with playground blueprint')}
							/>
						)}
					</PanelBody>
				</Panel>
			</InspectorControls>
		</div>
	);
});
