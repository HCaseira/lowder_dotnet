class TestPanel extends EditorPanel {
	constructor() {
		super();
		this.id = "test-panel";
	}

	populate() {
		document.getElementById(this.id).innerHTML = "";
	}

	selectNode(node) {
		const rootPanel = document.getElementById(this.id);
		if (!(node instanceof RootNode)) {
			return;
		}

		rootPanel.innerHTML = "";

		const mockState = Editor.project.getTestData(node.getId()) || "{\n}";
		const mockStateLabel = document.createElement("span");
		mockStateLabel.innerText = "Set a mock data for this screen to help you design and test it without needing to go through a series of actions to reach this screen with the proper data.";
		rootPanel.appendChild(mockStateLabel);
		
		const mockStateEl = document.createElement("textarea");
		mockStateEl.value = mockState;
		mockStateEl.onchange = () => {
			try {
				if (mockStateEl.value) {
					JSON.parse(mockStateEl.value);
				}
				Editor.project.setTestData(node.getId(), mockStateEl.value);
			} catch (ex) {
				alert(ex);
			}
		};
		rootPanel.appendChild(mockStateEl);

		const lastState = window.localStorage.getItem(node.getId()) || "{\n}";
		const lastStateAction = document.createElement("a");
		lastStateAction.innerText = " here ";
		lastStateAction.onclick = () => {
			Editor.project.setTestData(node.getId(), lastState);
			mockStateEl.value = lastState;
		};
		const lastStateLabelEnd = document.createElement("span");
		lastStateLabelEnd.innerText = " to set it as mock data.";
		const lastStateLabel = document.createElement("span");
		lastStateLabel.innerText = "The last known state for this screen. Click ";
		lastStateLabel.appendChild(lastStateAction);
		lastStateLabel.appendChild(lastStateLabelEnd);
		rootPanel.appendChild(lastStateLabel);

		const lastStateEl = document.createElement("textarea");
		lastStateEl.setAttribute("disabled", "disabled");
		lastStateEl.value = lastState;
		rootPanel.appendChild(lastStateEl);
	}
}
