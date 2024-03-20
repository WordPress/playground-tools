import {
	Modal,
	Button,
	// @ts-ignore
	__experimentalInputControl as InputControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

interface FileNameModalProps {
	title: string;
	onSave: (filename: string) => void;
	onRequestClose: () => void;
	initialFilename?: string;
}

export function FileNameModal({
	title,
	onSave,
	onRequestClose,
	initialFilename = '',
}: FileNameModalProps) {
	const [editedFileName, setEditedFileName] = useState(initialFilename);
	return (
		<Modal title={title} onRequestClose={onRequestClose}>
			<form
				onSubmit={(e) => {
					if (editedFileName) {
						onSave(editedFileName);
					}
					e.preventDefault();
				}}
			>
				<InputControl
					value={editedFileName}
					autoFocus
					onChange={(value: any) => {
						setEditedFileName(value || '');
					}}
				/>
				<br />
				<Button variant="primary" type="submit">
					{__('Done', 'interactive-code-block')}
				</Button>
			</form>
		</Modal>
	);
}
