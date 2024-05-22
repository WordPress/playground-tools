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
	onSave: (filename: string) => void;
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
	const [editedFileName, setEditedFileName] = useState(
		file?.remoteUrl || file?.name || ''
	);
	return (
		<Modal title={title} onRequestClose={onRequestClose}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (isLoading) {
						return;
					}
					if (editedFileName) {
						onSave(editedFileName);
					}
				}}
			>
				<InputControl
					value={editedFileName}
					placeholder="File name or URL"
					autoFocus
					onChange={(value: any) => {
						setEditedFileName(value || '');
					}}
				/>
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
