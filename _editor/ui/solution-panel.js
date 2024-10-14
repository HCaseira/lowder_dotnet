class SolutionPanel extends EditorPanel {
	constructor() {
		super();
		this.id = "solution-panel";
		this.cssId = "solution-panel";
	}

	selectNode(node) {
		const nodeId = node?.getId();
		if (!node.isRootNode) {
			return;
		}

		const rootPanel = document.getElementById(this.id);
		const elements = rootPanel.getElementsByClassName(this.cssId + "-item-selected");
		for (let child of elements) {
			child.classList.remove(this.cssId + "-item-selected");
		}

		const element = rootPanel.querySelectorAll('[node-id="' + nodeId + '"]');
		if (element && element.length > 0) {
			element[0].classList.add(this.cssId + "-item-selected");
		}
	}

	onNodeCreated(origin, node) {
		if (node.isRootNode) {
			this.populate();
			this.selectNode(node);
		}
	}

	onNodeUpdated(origin, node) {
		if (node.isRootNode) {
			this.populate();
			this.selectNode(node);
		}
	}

	onNodeDeleted(origin, node) {
		if (node.isRootNode) {
			this.populate();
			this.selectNode(node);
		}
	}

	populate() {
		const rootPanel = document.getElementById(this.id);
		rootPanel.innerHTML = "";

		for (let solution of Editor.project.solutions) {
			this.populateSolution(rootPanel, solution);
		}
	}

	populateSolution(rootPanel, solution) {
		const solutionId = solution.getId();
		const storageKey = `solution_${solutionId}_expanded`;
		let visible = !localStorage.getItem(storageKey);
		const childHolder = document.createElement("column");
		childHolder.className = this.cssId + "-item-holder";

		const toggleFunc = () => {
			if (visible) {
				localStorage.removeItem(storageKey);
				childHolder.classList.remove("hide");
				toggleElement.innerHTML = "expand_more";
			} else {
				localStorage.setItem(storageKey, true);
				childHolder.classList.add("hide");
				toggleElement.innerHTML = "navigate_next";
			}
		};

		const toggleElement = document.createElement("span");
		toggleElement.className = "form-panel-item-toggler material-symbols-outlined";
		toggleElement.innerHTML = "expand_more";
		toggleElement.onclick = (e) => {
			visible = !visible;
			toggleFunc();
			e.stopPropagation();
		};

		const name = document.createElement("span");
		name.classList.add(this.cssId + "-item-name");
		name.classList.add(this.cssId + "-solution-name");
		name.innerHTML = solution.name ?? solutionId;

		const actionIcon = document.createElement("span");
		actionIcon.className = this.cssId + "-item-action material-symbols-outlined";
		actionIcon.innerHTML = "add";
		actionIcon.onclick = () => this.onCreateNewNode(solution);

		const row = document.createElement("div");
		row.classList.add(this.cssId + "-item-solution");
		row.setAttribute("node-id", solutionId);
		row.appendChild(toggleElement);
		row.appendChild(name);
		row.appendChild(actionIcon);

		rootPanel.appendChild(row);
		rootPanel.appendChild(childHolder);
		toggleFunc();

		const folderMap = {};
		const folders = [...solution.folders];
		while (folders.length > 0) {
			let folder = folders[0];
			if (!folder.getFolder()) {
				let folderHolder = this.createNodeItem(childHolder, solution, folder, "folder");
				folderMap[folder.getId()] = folderHolder;
				folders.splice(0, 1);
			} else if (folderMap[folder.getFolder()]) {
				let folderHolder = this.createNodeItem(folderMap[folder.getFolder()], solution, folder, "folder");
				folderMap[folder.getId()] = folderHolder;
				folders.splice(0, 1);
			} else {
				folders.splice(0, 1);
				folders.push(folder);
			}
		}

		const nodesToPopulate = this.getNodesToPopulate(solution);
		const nodeTypeArrays = nodesToPopulate.types;
		const nodeArrays = nodesToPopulate.nodes;

		for (let i = 0; i < nodeArrays.length; i++) {
			let array = nodeArrays[i];
			let type = nodeTypeArrays[i];
			if (array) {
				for (let node of array) {
					let folder = node.getFolder();
					if (!folder || !folderMap[folder]) {
						this.createNodeItem(childHolder, solution, node, type);
					} else {
						this.createNodeItem(folderMap[folder], solution, node, type);
					}
				}
			}
		}

		if (childHolder.children.length === 0) {
			const noEntriesElement = this.buildNoEntriesMessage(solution);
			childHolder.appendChild(noEntriesElement);
		}
	}

	buildNoEntriesMessage(solution) {
		const nodes = this.getNodesToPopulate(solution).types[0];
		const holder = document.createElement("column");
		holder.classList.add(this.cssId + "-no-entries");
		holder.innerText = `No '${nodes}s' yet.\nClick here to create your first.`;
		holder.onclick = () => this.onCreateNewNode(solution);
		return holder;
	}

	getNodesToPopulate(solution) { }

	createNodeItem(parentElement, solution, node, type) {
		const icon = document.createElement("span");
		icon.className = this.cssId + "-item-icon material-symbols-outlined";
		switch (type) {
			case "folder":
				icon.innerHTML = "folder_open";
				break;
			case "model":
				icon.innerHTML = "assignment";
				break;
			case "request":
				icon.innerHTML = "cloud";
				break;
			case "controller":
				icon.innerHTML = "phone_iphone";
				break;
			case "query":
				icon.innerHTML = "style";
				break;
			case "mutation":
				icon.innerHTML = "widgets";
				break;
			case "screen":
				icon.innerHTML = "phone_iphone";
				break;
			case "template":
				icon.innerHTML = "style";
				break;
			case "component":
				icon.innerHTML = "layers";
				break;
		}

		const name = document.createElement("span");
		name.className = this.cssId + "-item-name";
		name.innerHTML = node.getName() ?? node.getId();

		const row = document.createElement("row");
		row.className = this.cssId + "-item";
		row.setAttribute("node-id", node.getId());
		row.addEventListener("click", () => this.onNodeClick(node));
		row.addEventListener("dblclick", () => this.onNodeDoubleClick(node));
		row.appendChild(icon);
		row.appendChild(name);
		parentElement.appendChild(row);

		const buttonHolder = document.createElement("row");
		buttonHolder.className = this.cssId + "-item-actions";
		row.appendChild(buttonHolder);

		if (solution.canMoveUp(type, node)) {
			const upButton = document.createElement("span");
			upButton.className = this.cssId + "-item-action material-symbols-outlined";
			upButton.innerHTML = "arrow_upward";
			upButton.title = "Move upward";
			upButton.onclick = () => {
				solution.moveRootNode(type, node, "up");
				Editor.onNodeUpdated(this.id, node);
			};
			buttonHolder.appendChild(upButton);
		}

		if (solution.canMoveDown(type, node)) {
			const downButton = document.createElement("span");
			downButton.className = this.cssId + "-item-action material-symbols-outlined";
			downButton.innerHTML = "arrow_downward";
			downButton.title = "Move downward";
			downButton.onclick = () => {
				solution.moveRootNode(type, node, "down");
				Editor.onNodeUpdated(this.id, node);
			};
			buttonHolder.appendChild(downButton);
		}

		if (type !== "folder") {
			const cloneButton = document.createElement("span");
			cloneButton.className = this.cssId + "-item-action material-symbols-outlined";
			cloneButton.innerHTML = "add_to_photos";
			cloneButton.title = "Clone this " + type;
			cloneButton.onclick = () => {
				const newNode = solution.cloneRootNode(type, node);
				if (newNode) {
					Editor.onNodeCreated(this.id, newNode);
				}
			};
			buttonHolder.appendChild(cloneButton);
		}

		if (Editor.project.solutions.length > 1) {
			const changeSolutionButton = document.createElement("span");
			changeSolutionButton.className = this.cssId + "-item-action material-symbols-outlined";
			changeSolutionButton.innerHTML = "swap_vertical_circle";
			changeSolutionButton.title = "Move to another Solution";
			changeSolutionButton.onclick = () => {
				this.changeSolution(solution, type, node);
			};
			buttonHolder.appendChild(changeSolutionButton);
		}
		
		const deleteButton = document.createElement("span");
		deleteButton.className = this.cssId + "-item-action material-symbols-outlined";
		deleteButton.innerHTML = "delete";
		deleteButton.title = "Remove";
		deleteButton.onclick = () => {
			if (confirm("Remove this " + type + "?")) {
				solution.removeRootNode(type, node);
				Editor.onNodeDeleted(this.id, node);
			}
		};
		buttonHolder.appendChild(deleteButton);

		if (type === "folder") {
			const childHolder = document.createElement("div");
			childHolder.className = this.cssId + "-item-holder";
			
			const storageKey = `solution_${node.getId()}_expanded`;
			let visible = !localStorage.getItem(storageKey);
			const toggleElement = document.createElement("span");
			toggleElement.className = "form-panel-item-toggler material-symbols-outlined";

			const toggleFunc = () => {
				if (visible) {
					localStorage.removeItem(storageKey);
					childHolder.classList.remove("hide");
					toggleElement.innerHTML = "expand_more";
				} else {
					localStorage.setItem(storageKey, true);
					childHolder.classList.add("hide");
					toggleElement.innerHTML = "navigate_next";
				}
			};

			const outerRow = document.createElement("row");
			outerRow.classList.add(this.cssId + "-item-folder");
			outerRow.appendChild(toggleElement);
			outerRow.appendChild(row);
			parentElement.appendChild(outerRow);
			parentElement.appendChild(childHolder);

			toggleElement.innerHTML = "expand_more";
			toggleElement.onclick = (e) => {
				visible = !visible;
				toggleFunc();
				e.stopPropagation();
			};
			toggleFunc();

			return childHolder;
		}
	}

	changeSolution(currentSolution, type, node) {
		const options = [];
		for (let sol of Editor.project.solutions) {
			if (sol.id !== currentSolution.id) {
				options.push({
					"id": sol.id,
					"name": sol.name,
				});
			}
		}
		if (options === 0) {
			return;
		}

		const tailFunction = (solutionId) => {
			Editor.project.changeSolution(type, node, solutionId);
			Editor.onNodeUpdated(this.id, node);
		};

		if (options.length === 1) {
			if (confirm(`Move ${type} ${node.getName()} to ${options[0].name}?`)) {
				tailFunction(options[0].id);
			}
		} else {
			showModalList(null, options, (v) => tailFunction(v.id));
		}
	}

	onCreateNewNode(solution) {
		const types = this.getNodesToPopulate(solution).types;
		showModalList(null, types.concat(["folder"]), (v) => {
			switch (v.toLowerCase()) {
				case "template":
				case "component":
					const schema = Editor.project.getSchema(solution.getId());
					const types = schema.getWidgetsOfType(null);
					showModalList(null, types, (selectedType) => {
						this.createNode(solution, v, selectedType);
					});
					break;
				default:
					return this.createNode(solution, v);
			}
		});
	}

	createNode(solution, type, prop) {
		const nameInput = document.createElement("input");
		nameInput.setAttribute("placeholder", "Name the new " + type);

		const noFolder = document.createElement("option");
		noFolder.value = "";
		noFolder.innerHTML = "Select a folder for the new " + type;
		noFolder.setAttribute("disabled", "disabled");
		noFolder.setAttribute("hidden", "hidden");
		noFolder.setAttribute("selected", "selected");
		const folderSelector = document.createElement("select");
		folderSelector.appendChild(noFolder);
		for (let folder of Editor.project.getFolders(solution.id)) {
			let option = document.createElement("option");
			option.value = folder.getId();
			option.innerHTML = folder.getName();
			folderSelector.appendChild(option);
		}

		const column = document.createElement("column");
		column.style.setProperty("gap", "10px");
		column.appendChild(nameInput);
		column.appendChild(folderSelector);

		showModalForm("New " + type, column, () => {
			let newNode;
			switch (type.toLowerCase()) {
				case "controller":
					newNode = solution.createController();
					break;
				case "query":
					newNode = solution.createGraph("Query");
					break;
				case "mutation":
					newNode = solution.createGraph("Mutation");
					break;
				case "screen":
					newNode = solution.createScreen();
					break;
				case "template":
					newNode = solution.createTemplate(prop);
					break;
				case "component":
					newNode = solution.createComponent(prop);
					break;
				case "model":
					newNode = solution.createModel();
					break;
				case "request":
					newNode = solution.createRequest();
					break;
				case "folder":
					newNode = solution.createFolder();
					break;
				default:
					return;
			}
	
			if (newNode) {
				if (nameInput.value) {
					newNode.setName(nameInput.value);
				}
				if (folderSelector.value) {
					newNode.setFolder(folderSelector.value);
				}
				Editor.onNodeCreated(this.id, newNode);
				if (type.toLowerCase() !== "folder") {
					Editor.selectNode(newNode);
				}
			}
		});
		nameInput.focus();
	}

	onNodeClick(node) {
		Editor.selectNode(node);
	}

	onNodeDoubleClick(node) {
	}

	static onToolbarClick(idx) {
		// SolutionPanel.onToolbarSetVisibility(true);
		const toolbar = document.getElementById("solution-tabs-buttons");
		for (let child of toolbar.children) {
			child.classList.remove("collapsible-tabs-button-selected");
		}
		toolbar.children[idx].classList.add("collapsible-tabs-button-selected");

		const panelHolder = document.getElementById("explorer-tabs-panels");
		for (let child of panelHolder.children)
			child.classList.add("hidden");
		panelHolder.children[idx].classList.remove("hidden");
	}

	static onToolbarOver(idx) {
		SolutionPanel.onToolbarClick(idx);
	}

	static onToolbarToggle() {
		const panel = document.getElementById("explorer-tabs");
		SolutionPanel.onToolbarSetVisibility(panel.classList.contains("collapsible-tabs-collapsed"));
	}

	static onToolbarSetVisibility(visible = true) {
		const panel = document.getElementById("explorer-tabs");
		const toggler = document.getElementById("solution-tabs-toggler");
		if (visible)
		{
			toggler.innerHTML = "chevron_left";
			panel.classList.remove("collapsible-tabs-collapsed");
			
		}
		else
		{
			toggler.innerHTML = "chevron_right";
			panel.classList.add("collapsible-tabs-collapsed");
		}
	}
}


class ScreenPanel extends SolutionPanel {
	constructor() {
		super();
		this.id = "screen-panel";
	}

	getNodesToPopulate(solution) {
		return {
			types: ["screen"],
			nodes: [solution.screens]
		};
	}
}


class TemplatePanel extends SolutionPanel {
	constructor() {
		super();
		this.id = "template-panel";
	}

	getNodesToPopulate(solution) {
		return {
			types: ["template"],
			nodes: [solution.templates]
		};
	}
}


class ComponentPanel extends SolutionPanel {
	constructor() {
		super();
		this.id = "component-panel";
	}

	getNodesToPopulate(solution) {
		return {
			types: ["component"],
			nodes: [solution.components]
		};
	}
}


class ControllerPanel extends SolutionPanel {
	constructor() {
		super();
		this.id = "controller-panel";
	}

	getNodesToPopulate(solution) {
		return {
			types: ["controller"],
			nodes: [solution.controllers]
		};
	}
}


class GraphPanel extends SolutionPanel {
	constructor() {
		super();
		this.id = "graph-panel";
	}

	getNodesToPopulate(solution) {
		return {
			types: ["query", "mutation"],
			nodes: [
				solution.graphs.filter(e => e.getType() === "Query"),
				solution.graphs.filter(e => e.getType() === "Mutation")
			]
		};
	}
}


class TypePanel extends SolutionPanel {
	constructor() {
		super();
		this.id = "type-panel";
	}

	getNodesToPopulate(solution) {
		return {
			types: ["request", "model"],
			nodes: [
				solution.types.filter(e => Schema.isRequest(e.extends)),
				solution.types.filter(e => Schema.isModel(e.extends))
			]
		};
	}
}