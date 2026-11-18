import type {Node as ProseMirrorNode, Slice} from '@tiptap/pm/model'

/**
 * Serializes a copied slice to plain text, keeping list markers so a copied list
 * still reads (and re-pastes) as a list.
 */
export function serializeSliceToText(slice: Slice): string {
	const lines: string[] = []
	slice.content.forEach(node => serializeBlock(node, '', lines))
	return lines.join('\n')
}

function inlineText(node: ProseMirrorNode): string {
	let text = ''
	node.forEach(child => {
		if (child.isText) {
			text += child.text ?? ''
		} else if (child.type.name === 'hardBreak') {
			text += '\n'
		} else {
			const renderText = child.type.spec.leafText
			text += renderText ? renderText(child) : child.textContent
		}
	})
	return text
}

function serializeListItems(list: ProseMirrorNode, indent: string, lines: string[]) {
	const ordered = list.type.name === 'orderedList'
	let index = typeof list.attrs.start === 'number' ? list.attrs.start : 1

	list.forEach(item => {
		let marker = ordered ? `${index}. ` : '- '
		if (item.type.name === 'taskItem') {
			marker = `- [${item.attrs.checked ? 'x' : ' '}] `
		}
		index++

		let first = true
		item.forEach(child => {
			if (first && child.isTextblock) {
				lines.push(indent + marker + inlineText(child))
			} else {
				serializeBlock(child, indent + ' '.repeat(marker.length), lines)
			}
			first = false
		})
		if (first) {
			lines.push(indent + marker.trimEnd())
		}
	})
}

function serializeBlock(node: ProseMirrorNode, indent: string, lines: string[]) {
	if (node.isText) {
		lines.push(indent + (node.text ?? ''))
		return
	}

	if (['bulletList', 'orderedList', 'taskList'].includes(node.type.name)) {
		serializeListItems(node, indent, lines)
		return
	}

	if (['listItem', 'taskItem'].includes(node.type.name)) {
		node.forEach(child => serializeBlock(child, indent, lines))
		return
	}

	if (node.isTextblock) {
		lines.push(indent + inlineText(node))
		return
	}

	if (node.isLeaf) {
		const renderText = node.type.spec.leafText
		lines.push(indent + (renderText ? renderText(node) : node.textContent))
		return
	}

	node.forEach(child => serializeBlock(child, indent, lines))
}
