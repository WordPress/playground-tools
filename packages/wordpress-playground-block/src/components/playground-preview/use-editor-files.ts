import { useState, useCallback, useEffect } from '@wordpress/element';
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
