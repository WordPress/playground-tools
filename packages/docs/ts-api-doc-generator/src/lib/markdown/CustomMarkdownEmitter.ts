// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import colors from 'colors';

import type { DocNode, DocLinkTag, StringBuilder } from '@microsoft/tsdoc';
import type {
	ApiModel,
	IResolveDeclarationReferenceResult,
	ApiItem,
} from '@microsoft/api-extractor-model';

import { CustomDocNodeKind } from '../nodes/CustomDocNodeKind';
import type { DocHeading } from '../nodes/DocHeading';
import type { DocNoteBox } from '../nodes/DocNoteBox';
import type { DocTable } from '../nodes/DocTable';
import type { DocTableCell } from '../nodes/DocTableCell';
import type { DocEmphasisSpan } from '../nodes/DocEmphasisSpan';
import {
	MarkdownEmitter,
	IMarkdownEmitterContext,
	IMarkdownEmitterOptions,
} from './MarkdownEmitter';
import type { IndentedWriter } from '../utils/IndentedWriter';
import type { DocContentBlock } from '../nodes/DocContentBlock';
import type { DocMaybe } from '../nodes/DocMaybe';

export interface ICustomMarkdownEmitterOptions extends IMarkdownEmitterOptions {
	contextApiItem: ApiItem | undefined;

	onGetFilenameForApiItem: (apiItem: ApiItem) => string | undefined;
}

export class CustomMarkdownEmitter extends MarkdownEmitter {
	private _apiModel: ApiModel;

	public constructor(apiModel: ApiModel) {
		super();

		this._apiModel = apiModel;
	}

	public override emit(
		stringBuilder: StringBuilder,
		docNode: DocNode,
		options: ICustomMarkdownEmitterOptions
	): string {
		return super.emit(stringBuilder, docNode, options);
	}

	/** @override */
	protected override writeNode(
		docNode: DocNode,
		context: IMarkdownEmitterContext,
		docNodeSiblings: boolean
	): void {
		const writer: IndentedWriter = context.writer;

		switch (docNode.kind) {
			case CustomDocNodeKind.Heading: {
				const docHeading: DocHeading = docNode as DocHeading;
				writer.ensureSkippedLine();

				let prefix: string;
				switch (docHeading.level) {
					case 1:
						prefix = '##';
						break;
					case 2:
						prefix = '###';
						break;
					case 3:
						prefix = '###';
						break;
					default:
						prefix = '####';
				}

				writer.writeLine(
					prefix + ' ' + this.getEscapedText(docHeading.title)
				);
				writer.writeLine();
				break;
			}
			case CustomDocNodeKind.ForceSoftBreak: {
				writer.write(' ');
				break;
			}
			case CustomDocNodeKind.NoteBox: {
				const docNoteBox: DocNoteBox = docNode as DocNoteBox;
				writer.ensureNewLine();

				writer.increaseIndent('> ');

				this.writeNode(docNoteBox.content, context, false);
				writer.ensureNewLine();

				writer.decreaseIndent();

				writer.writeLine();
				break;
			}
			case CustomDocNodeKind.Table: {
				const docTable: DocTable = docNode as DocTable;
				// GitHub's markdown renderer chokes on tables that don't have a blank line above them,
				// whereas VS Code's renderer is totally fine with it.
				writer.ensureSkippedLine();

				context.insideTable = true;

				// Markdown table rows can have inconsistent cell counts.  Size the table based on the longest row.
				let columnCount = 0;
				if (docTable.header) {
					columnCount = docTable.header.cells.length;
				}
				for (const row of docTable.rows) {
					if (row.cells.length > columnCount) {
						columnCount = row.cells.length;
					}
				}

				// write the table header (which is required by Markdown)
				writer.write('| ');
				for (let i = 0; i < columnCount; ++i) {
					writer.write(' ');
					if (docTable.header) {
						const cell: DocTableCell | undefined =
							docTable.header.cells[i];
						if (cell) {
							this.writeNode(cell.content, context, false);
						}
					}
					writer.write(' |');
				}
				writer.writeLine();

				// write the divider
				writer.write('| ');
				for (let i = 0; i < columnCount; ++i) {
					writer.write(' --- |');
				}
				writer.writeLine();

				for (const row of docTable.rows) {
					writer.write('| ');
					for (const cell of row.cells) {
						writer.write(' ');
						this.writeNode(cell.content, context, false);
						writer.write(' |');
					}
					writer.writeLine();
				}
				writer.writeLine();

				context.insideTable = false;

				break;
			}
			case CustomDocNodeKind.Maybe: {
				const maybe: DocMaybe = docNode as DocMaybe;
				if (maybe.isActive) {
					this.writeNodes(maybe.getChildNodes(), context);
				}

				break;
			}
			case CustomDocNodeKind.ContentBlock: {
				const block: DocContentBlock = docNode as DocContentBlock;

				if (block.type === 'block') {
					writer.ensureSkippedLine();
					for (const item of block.items) {
						this.writeNode(item, context, false);
					}
				} else if (block.type === 'literal') {
					writer.write(block.text);
				} else {
					++context.inlineBlockNestingLevel;
					if (block.isWhitespace) {
						writer.write(' ');
					} else if (block.isList) {
						writer.ensureSkippedLine();
						for (
							let i = 0, max = block.items.length - 1;
							i <= max;
							i++
						) {
							const item = block.items[i];
							if (block.type === 'ul') {
								writer.write('* ');
							} else if (block.type === 'ol') {
								writer.write('1. ');
							}
							this.writeNode(item, context, false);
							writer.writeLine();
						}
					} else {
						if (block.isHeading) {
							writer.write('#'.repeat(block.headingLevel) + ' ');
						}
						for (const item of block.items) {
							this.writeNode(item, context, false);
						}
					}
					--context.inlineBlockNestingLevel;
				}
				if (context.inlineBlockNestingLevel === 0) {
					writer.writeLine();
				}
				break;
			}
			case CustomDocNodeKind.EmphasisSpan: {
				const docEmphasisSpan: DocEmphasisSpan =
					docNode as DocEmphasisSpan;
				const oldBold: boolean = context.boldRequested;
				const oldItalic: boolean = context.italicRequested;
				context.boldRequested = docEmphasisSpan.bold;
				context.italicRequested = docEmphasisSpan.italic;
				this.writeNodes(docEmphasisSpan.nodes, context);
				context.boldRequested = oldBold;
				context.italicRequested = oldItalic;
				break;
			}
			default:
				super.writeNode(docNode, context, docNodeSiblings);
		}
	}

	/** @override */
	protected override writeLinkTagWithCodeDestination(
		docLinkTag: DocLinkTag,
		context: IMarkdownEmitterContext<ICustomMarkdownEmitterOptions>
	): void {
		const options: ICustomMarkdownEmitterOptions = context.options;

		const result: IResolveDeclarationReferenceResult =
			this._apiModel.resolveDeclarationReference(
				docLinkTag.codeDestination!,
				options.contextApiItem
			);

		if (result.resolvedApiItem) {
			const filename: string | undefined =
				options.onGetFilenameForApiItem(result.resolvedApiItem);

			if (filename) {
				let linkText: string = docLinkTag.linkText || '';
				if (linkText.length === 0) {
					// Generate a name such as Namespace1.Namespace2.MyClass.myMethod()
					linkText =
						result.resolvedApiItem.getScopedNameWithinPackage();
				}
				if (linkText.length > 0) {
					const encodedLinkText: string = this.getEscapedText(
						linkText.replace(/\s+/g, ' ')
					);

					context.writer.write('[');
					context.writer.write(encodedLinkText);
					context.writer.write(`](${filename!})`);
				} else {
					console.log(
						colors.yellow('WARNING: Unable to determine link text')
					);
				}
			}
		} else if (result.errorMessage) {
			console.log(
				colors.yellow(
					`WARNING: Unable to resolve reference "${docLinkTag.codeDestination!.emitAsTsdoc()}": ` +
						result.errorMessage
				)
			);
		}
	}
}