class JsonPanel extends EditorPanel {
	constructor() {
		super();
		this.id = "json-panel";
	}

	populate() {
		document.getElementById(this.id).innerHTML = "";
	}

	onNodeUpdated(origin, node, screen) {
		this.selectNode(node);
	}

	selectNode(node) {
		const rootPanel = document.getElementById(this.id);
		rootPanel.innerHTML = "";

		const editor = document.createElement("textarea");
		editor.className = "json-panel-editor";
		editor.value = stringify(node);
		editor.onchange = (v) => { this.updateNode(editor.value, node); };
		rootPanel.appendChild(editor);
	}
	updateNode(json, node) {
		try {
			const obj = JSON.parse(json);
			node.fromObject(obj);
			Editor.onNodeUpdated(this.id, node);
		} catch (ex) {
			alert(ex);
		}
	}
}
