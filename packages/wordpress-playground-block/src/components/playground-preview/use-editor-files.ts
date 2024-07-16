import { useState, useCallback, useEffect } from '@wordpress/element';
import { __, sprintf } from '../../i18n';
import type { EditorFile } from '../../index';

export type UseEditorFilesOptions = {
	withErrorLog: boolean;
	getErrors?: () => Promise<string>;
};
export type EditorFileMapper = (file: EditorFile) => EditorFile;
export default function useEditorFiles(
	filesAttribute: EditorFile[],
	{ withErrorLog = false, getErrors }: UseEditorFilesOptions
) {
	const [files, setFiles] = useState<EditorFile[]>(filesAttribute || []);

	const [activeFileIndex, setActiveFileIndex] = useState(0);
	const activeFile = files[activeFileIndex];

	const updateFile = useCallback(
		(mapper: EditorFileMapper, index: number = activeFileIndex) => {
			setFiles(
				files.map((file, i) => (i === index ? mapper(file) : file))
			);
		},
		[activeFileIndex, files, setFiles]
	);

	const removeFile = useCallback(
		(index: number = activeFileIndex) => {
			setFiles(files.filter((_, i) => i !== index));
		},
		[activeFileIndex]
	);

	const addFile = useCallback(
		(file: EditorFile, index = files.length) => {
			setFiles([...files.slice(0, index), file, ...files.slice(index)]);
		},
		[files, setFiles]
	);

	async function fetchRemoteFile(file: EditorFile) {
		try {
			const response = await fetch(file.remoteUrl!);
			const contents = await response.text();
			updateFile(
				(existingFile) => ({ ...existingFile, contents }),
				files.indexOf(file)
			);
		} catch {
			updateFile(
				(existingFile) => ({
					...existingFile,
					contents: sprintf(
						/* translators: %s: A URL for a remote file. */
						__('Failed to fetch the remote file from %s'),
						file.remoteUrl
					),
					name: sprintf(
						/* translators: %s: A file name. */
						__('%s (Failed to fetch)'),
						existingFile.name
					),
				}),
				files.indexOf(file)
			);
		}
	}

	const [isLoading, setIsLoading] = useState(
		files.filter((file) => file.remoteUrl).length > 0
	);
	// Fetch all the remote files when the block is loaded.
	useEffect(() => {
		async function fetchRemoteFiles() {
			try {
				await Promise.all(
					files.filter((file) => file.remoteUrl).map(fetchRemoteFile)
				);
			} finally {
				setIsLoading(false);
			}
		}
		fetchRemoteFiles();
	}, []);

	// Prepend or remove the error log file depending on the `enabled` prop.
	useEffect(() => {
		async function doHandleErrorLog() {
			const errorLogIndex = files.findIndex(isErrorLogFile);
			if (withErrorLog) {
				if (errorLogIndex === -1) {
					addFile(
						{
							name: ERROR_LOG_FILE_NAME,
							contents: (await getErrors?.()) || '',
						},
						1
					);
				}
			} else {
				// Found the error log file and remove it.
				if (errorLogIndex !== -1) {
					removeFile(errorLogIndex);
				}
			}
		}
		doHandleErrorLog();
	}, [withErrorLog]);

	// Update the error log file every 1000ms
	useEffect(() => {
		if (!withErrorLog) {
			return;
		}
		const interval = setInterval(async function () {
			const errorLogIndex = files.findIndex(isErrorLogFile);
			if (errorLogIndex === -1) {
				return;
			}

			const errors = (await getErrors?.()) || '';
			if (errors === files[errorLogIndex].contents) {
				return;
			}
			updateFile(
				(file) => ({ ...file, contents: errors }),
				errorLogIndex
			);
		}, 1000);
		return () => clearInterval(interval);
	}, [withErrorLog, files, getErrors]);

	return {
		files,
		addFile,
		isLoading,
		updateFile,
		removeFile,
		activeFile,
		activeFileIndex,
		setActiveFileIndex,
	};
}

export const ERROR_LOG_FILE_NAME = 'PHP error_log';

export function isErrorLogFile(file: EditorFile) {
	return file.name === ERROR_LOG_FILE_NAME;
}
