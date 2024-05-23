import {
	Modal,
	Button,
	// @ts-ignore
	__experimentalInputControl as InputControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { EditorFile } from '..';

interface FileNameModalProps {
	title: string;
	onSave: (file: Partial<EditorFile>) => void;
	onRequestClose: () => void;
	file?: EditorFile;
	isLoading?: boolean;
	error?: boolean;
}

export function FileNameModal({
	title,
	onSave,
	error,
	isLoading,
	onRequestClose,
	file,
}: FileNameModalProps) {
	const [editedFileName, setEditedFileName] = useState(file?.name || '');
	const [editedFileUrl, setEditedFileUrl] = useState(file?.remoteUrl || '');
	return (
		<Modal title={title} onRequestClose={onRequestClose}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (isLoading) {
						return;
					}
					if (editedFileName) {
						onSave({
							name: editedFileName,
							remoteUrl: editedFileUrl,
						});
					}
				}}
			>
				<div style={{ marginTop: '1em' }}>
					<InputControl
						value={editedFileName}
						label="File name"
						autoFocus
						onChange={(value: any) => {
							setEditedFileName(value || '');
						}}
					/>
				</div>
				<div style={{ marginTop: '1em' }}>
					<InputControl
						value={editedFileUrl}
						label="Load content from remote URL (optional)"
						onChange={(value: any) => {
							setEditedFileUrl(value || '');
						}}
					/>
				</div>
				{isLoading && 'Fetching the remote file...'}
				{error && (
					<p style={{ color: 'red', marginTop: '1em' }}>
						The file could not be fetched. Check the browser dev
						tools for more information.
					</p>
				)}
				<br />
				<Button variant="primary" type="submit">
					Done
				</Button>
			</form>
		</Modal>
	);
}
