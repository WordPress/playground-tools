import { useState, useCallback } from '@wordpress/element';
import type { EditorFile } from '../index';

export type EditorFileMapper = (file: EditorFile) => EditorFile;
export default function useEditorFiles(filesAttribute: EditorFile[]) {
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
		(file: EditorFile) => {
			setFiles([...files, file]);
		},
		[files, setFiles]
	);

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
