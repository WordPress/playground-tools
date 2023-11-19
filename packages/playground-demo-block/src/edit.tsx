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
	__experimentalInputControl as InputControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import PlaygroundDemo from './components/PlaygroundDemo';
import './editor.scss';

export default function Edit({
	isSelected,
	setAttributes,
	attributes,
}: BlockEditProps<Attributes>) {
	const {
		codeEditor,
		codeEditorReadOnly,
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
		blueprint,
	} = attributes;

	return (
		<div {...useBlockProps()}>
			<PlaygroundDemo
				showAddNewFile={isSelected && codeEditorMultipleFiles}
				showFileControls={isSelected}
				onStateChange={({ files }) => {
					setAttributes({
						files,
					});
				}}
				{...attributes}
			/>
			<InspectorControls>
				<Panel header="Settings">
					<PanelBody title="General" initialOpen={true}>
						<ToggleControl
							label="Code editor"
							help={
								codeEditor
									? 'Code editor enabled.'
									: 'Code editor disabled.'
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
									label="Code editor: read only"
									help={
										codeEditorReadOnly
											? 'Code editor is read only.'
											: 'Code editor is editable.'
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
									label="Code editor: multiple files"
									help={
										codeEditorMultipleFiles
											? 'Multiple files allowed.'
											: 'Single file allowed.'
									}
									checked={codeEditorMultipleFiles}
									onChange={() => {
										setAttributes({
											codeEditorMultipleFiles:
												!codeEditorMultipleFiles,
										});
									}}
								/>
								<SelectControl
									help={
										<div>
											Decide how your code from the editor
											will be used inside the Playground
											WordPress installation.
											<ul>
												<li>
													<strong>Plugin</strong>: all
													the files will be placed in
													a separate plugin which will
													be automatically enabled in
													the Playground.
												</li>
												<li>
													<strong>
														Editor script
													</strong>
													: the code will be executed
													directly in the Gutenberg
													editor (using{' '}
													<code>
														<small>
															wp_add_inline_script
														</small>
													</code>{' '}
													with{' '}
													<code>
														<small>wp-block</small>
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
							</>
						)}
					</PanelBody>
					<PanelBody title="Playground" initialOpen={false}>
						<ToggleControl
							label="Log in automatically"
							help={
								logInUser
									? 'User will be logged in.'
									: "User won't be logged in."
							}
							checked={logInUser}
							onChange={() => {
								setAttributes({
									logInUser: !logInUser,
								});
							}}
						/>
						<ToggleControl
							label="Create new post or page"
							help={
								createNewPost
									? 'New post or page will be created.'
									: 'No new posts or pages will be created.'
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
									label="Create new: post type"
									value={createNewPostType}
									onChange={(value) => {
										setAttributes({
											createNewPostType:
												value?.toString(),
										});
									}}
									isBlock
								>
									<ToggleGroupControlOption
										value="post"
										label="Post"
									/>
									<ToggleGroupControlOption
										value="page"
										label="Page"
									/>
								</ToggleGroupControl>
								<InputControl
									value={createNewPostTitle}
									onChange={(value) => {
										setAttributes({
											createNewPostTitle: value,
										});
									}}
									label="Create new: title"
									placeholder="Hello World!"
								/>
								<TextareaControl
									value={createNewPostContent}
									onChange={(value) => {
										setAttributes({
											createNewPostContent: value,
										});
									}}
									label="Create new: content"
									help="Gutenberg editor content of the post"
								/>
								<ToggleControl
									label="Create new: redirect to post"
									help={
										redirectToPost
											? 'User will be redirected.'
											: "User won't be redirected."
									}
									checked={redirectToPost}
									onChange={() => {
										setAttributes({
											redirectToPost: !redirectToPost,
										});
									}}
								/>
								{redirectToPost && (
									<ToggleGroupControl
										label="Create new redirect: redirect to"
										value={redirectToPostType}
										onChange={(value) => {
											setAttributes({
												redirectToPostType:
													value?.toString(),
											});
										}}
										isBlock
									>
										<ToggleGroupControlOption
											value="front"
											label="Front page"
										/>
										<ToggleGroupControlOption
											value="admin"
											label="Edit screen"
										/>
									</ToggleGroupControl>
								)}
							</>
						)}
						{(!createNewPost || !redirectToPost) && (
							<InputControl
								value={landingPageUrl}
								onChange={(value) => {
									setAttributes({
										landingPageUrl: value,
									});
								}}
								label="Landing page"
								help="Define where to redirect after Playground is loaded."
								placeholder="Got to url after load (eg. /wp-admin/)"
							/>
						)}
						<TextareaControl
							value={blueprint}
							onChange={(value) => {
								setAttributes({
									blueprint: value,
								});
							}}
							label="Blueprint"
							help="JSON file with playground blueprint"
						/>
					</PanelBody>
				</Panel>
			</InspectorControls>
		</div>
	);
}
