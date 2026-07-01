// Whether an href/src/xlink:href/formaction attribute contains a javascript:
// URL (ignoring whitespace obfuscation like "java\tscript:").
export function isJavascriptUrlAttribute(name: string, value: string): boolean {
	if (
		name !== 'href' &&
		name !== 'src' &&
		name !== 'xlink:href' &&
		name !== 'formaction'
	) {
		return false;
	}

	const normalized = value.toLowerCase().replace(/\s+/g, '');
	return normalized.startsWith('javascript:');
}

// Strips executable elements/attributes from an exported snapshot's DOM tree.
export function sanitizeExportContainer(root: HTMLElement): void {
	root
		.querySelectorAll(
			'script, iframe, object, embed, link[rel="import"], base, meta[http-equiv="refresh"]',
		)
		.forEach((node) => {
			node.remove();
		});

	root.querySelectorAll('*').forEach((element) => {
		for (const attribute of Array.from(element.attributes)) {
			const attrName = attribute.name.toLowerCase();
			const attrValue = attribute.value;

			if (attrName.startsWith('on')) {
				element.removeAttribute(attribute.name);
				continue;
			}

			if (attrName === 'srcdoc') {
				element.removeAttribute(attribute.name);
				continue;
			}

			if (isJavascriptUrlAttribute(attrName, attrValue)) {
				element.removeAttribute(attribute.name);
			}
		}
	});
}

// Builds a standalone HTML document snapshot of the current #editor content,
// with the given inline style sheets and executable content stripped out.
export function buildExportHtml(style: string, customStyle: string): string {
	const exportDoc = document.implementation.createHTMLDocument(
		'Markdown Live Editor Export',
	);
	const metaCharset = exportDoc.createElement('meta');
	metaCharset.setAttribute('charset', 'UTF-8');
	exportDoc.head.appendChild(metaCharset);

	const metaViewport = exportDoc.createElement('meta');
	metaViewport.name = 'viewport';
	metaViewport.content = 'width=device-width, initial-scale=1.0';
	exportDoc.head.appendChild(metaViewport);

	const titleElement = exportDoc.createElement('title');
	titleElement.textContent = 'Markdown Live Editor Export';
	exportDoc.head.appendChild(titleElement);

	if (style) {
		const styleElement = exportDoc.createElement('style');
		styleElement.textContent = style;
		exportDoc.head.appendChild(styleElement);
	}

	if (customStyle) {
		const customStyleElement = exportDoc.createElement('style');
		customStyleElement.textContent = customStyle;
		exportDoc.head.appendChild(customStyleElement);
	}

	const editorElement = document.getElementById('editor');
	const wrapper = exportDoc.createElement('div');
	wrapper.className = 'markdown-live-export';
	wrapper.innerHTML = editorElement?.innerHTML ?? '';
	sanitizeExportContainer(wrapper);
	exportDoc.body.appendChild(wrapper);

	return `<!DOCTYPE html>\n${exportDoc.documentElement.outerHTML}`;
}
