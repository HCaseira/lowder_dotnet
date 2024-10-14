class Project {
	build(solutions) {
		// A Solution can have Schema but no Model (eg: Lowder)
		this.solutions = [];
		this._solutions = {};

		this._mergeSchemas(solutions);

		for (let solutionData of solutions) {
			if (solutionData.name === "Lowder") {
				continue;
			}
			
			let solution;
			if (solutionData.filePath) {
				solution = new Solution();
				solutionData.data.id ??= getUUID();
			}
			
			let solutionId = solutionData.data?.id ?? solutionData.name;
			let schema = new Schema(solutionId, solutionData);

			this._solutions[solutionId] = {
				id: solutionId,
				name: solutionData.name,
				filePath: solutionData.filePath,
				absolutePath: solutionData.absolutePath,
				schema: schema,
				schemaStats: solutionData.schemaStats,
				solution: solution,
			};

			if (solution) {
				this.solutions.unshift(solution);
				solution.build(solutionData.name, solutionData.filePath, solutionData.data ?? {});
			}
		}
	}

	updateSchema(schemaData) {
		this._mergeSchemas(schemaData);
		const solutionList = [];
		for (let key in this._solutions) {
			solutionList.push(this._solutions[key]);
		}

		for (let schema of schemaData) {
			let solution = solutionList.find(s => s.name === schema.name && s.filePath === schema.filePath);
			if (solution) {
				solution.schema = new Schema(solution.id, schema);
				solution.schemaStats = schema.schemaStats;
			}
		}
	}

	_mergeSchemas(schemas) {
		// All Solutions have access to Lowder Schema, but only the Top Solution has access to all Schemas.
		// Intermediate Solutions will have access to it's own Schema and Lowder's
		const lowder = schemas.find(s => s.name === "Lowder") ?? {};
		const objectTypes = ["widgets", "actions", "controllers", "graphs", "properties"];
		const baseSchemaObjects = {};
		const cumulativeSchemaObjects = {};

		for (let objType of objectTypes) {
			baseSchemaObjects[objType] = lowder[objType] ?? {};
			cumulativeSchemaObjects[objType] = {};
		}

		for (let i = 0; i < schemas.length; i++) {
			let schema = schemas[i];
			if (schema.name === "Lowder") {
				continue;
			}

			schema.schemaStats = {};
			for (let objType of objectTypes) {
				var schemaObjs = schema[objType] ?? {};
				schema.schemaStats[objType] = Object.keys(schemaObjs).length;

				mergeMaps(schemaObjs, baseSchemaObjects[objType]);
				if (i === schemas.length - 1) {
					mergeMaps(schemaObjs, cumulativeSchemaObjects[objType]);
				} else {
					mergeMaps(cumulativeSchemaObjects[objType], schemaObjs);
				}
			}
		}
	}

	getSchema(solutionId) {
		return this._solutions[solutionId]?.schema;
	}

	getSchemaStats(solutionId) {
		return this._solutions[solutionId]?.schemaStats;
	}

	_getSolutionsForId(solutionId) {
		if (solutionId === this.getTopSolution().id) {
			return this.solutions;
		}
		return [this.getSolution(solutionId)];
	}

	getSolution(id) {
		for (let solution of this.solutions) {
			if (solution.getId() === id)
				return solution;
		}
		return null;
	}

	getTopSolution() {
		return this.solutions[0];
	}

	getFolders(solutionId) {
		return this.getSolution(solutionId)?.folders ?? [];
	}

	getScreen(id) {
		for (let solution of this.solutions) {
			let obj = solution.getScreen(id);
			if (obj) {
				return obj;
			}
		}
		return null;
	}

	findWidget(id) {
		for (let solution of this.solutions) {
			let obj = solution.findWidget(id);
			if (obj) {
				return obj;
			}
		}
		return null;
	}

	getScreens(solutionId) {
		let results = [];
		for (let solution of this._getSolutionsForId(solutionId)) {
			let obj = solution.screens;
			if (obj)
				results = results.concat(obj);
		}
		return results;
	}

	getTemplate(id) {
		for (let solution of this.solutions) {
			let obj = solution.getTemplate(id);
			if (obj) {
				return obj;
			}
		}
		return null;
	}

	findTemplates(solutionId, widgetType) {
		let types = [];
		for (let solution of this._getSolutionsForId(solutionId)) {
			let obj = solution.findTemplates(widgetType);
			if (obj)
				types = types.concat(obj);
		}
		return types;
	}

	getTemplates(solutionId) {
		let results = [];
		for (let solution of this._getSolutionsForId(solutionId)) {
			let obj = solution.templates;
			if (obj)
				results = results.concat(obj);
		}
		return results;
	}

	getComponent(id) {
		for (let solution of this.solutions) {
			let obj = solution.getComponent(id);
			if (obj) {
				return obj;
			}
		}
		return null;
	}

	findComponents(solutionId, widgetType) {
		let types = [];
		for (let solution of this._getSolutionsForId(solutionId)) {
			let obj = solution.findComponents(widgetType);
			if (obj)
				types = types.concat(obj);
		}
		return types;
	}

	getComponents(solutionId) {
		let results = [];
		for (let solution of this._getSolutionsForId(solutionId)) {
			let obj = solution.components;
			if (obj)
				results = results.concat(obj);
		}
		return results;
	}

	getController(id) {
		for (let entry of this.solutions) {
			let obj = entry.getController(id);
			if (obj) {
				return obj;
			}
		}
		return null;
	}

	getGraph(id) {
		for (let entry of this.solutions) {
			let obj = entry.getGraph(id);
			if (obj) {
				return obj;
			}
		}
		return null;
	}

	getModel(type) {
		for (let solution of this.solutions) {
			let obj = solution.getModel(type);
			if (obj)
				return obj;
		}
		return null;
	}

	getModels(solutionId) {
		let types = [];
		for (let solution of this._getSolutionsForId(solutionId)) {
			let obj = solution.getModels();
			if (obj)
				types = types.concat(obj);
		}
		return types;
	}

	getRequest(type) {
		for (let solution of this.solutions) {
			let obj = solution.getRequest(type);
			if (obj)
				return obj;
		}
		return null;
	}

	getRequests(solutionId) {
		let results = [];
		for (let solution of this._getSolutionsForId(solutionId)) {
			let obj = solution.getRequests();
			if (obj)
				results = results.concat(obj);
		}
		return results;
	}

	getTypes(solutionId) {
		let results = [];
		for (let solution of this._getSolutionsForId(solutionId)) {
			let obj = solution.types;
			if (obj)
				results = results.concat(obj);
		}
		return results;
	}

	getTestData(nodeId) {
		return window.localStorage.getItem(`${nodeId}_mock`);
	}

	setTestData(nodeId, data) {
		window.localStorage.setItem(`${nodeId}_mock`, data);
	}

	changeSolution(type, node, solutionId) {
		this.getSolution(node.getSolutionId()).removeRootNode(type, node);
		this.getSolution(solutionId).appendRootNode(type, node);
	}

	findReferences(text, matchCase, matchWord, isExpression) {
		// /(?<!\w)word(?!\w)/gi
		let options = "g";
		if (!matchCase) {
			options += "i";
		}

		let expression;
		if (isExpression) {
			expression = new RegExp(text, options);
		} else {
			if (matchWord) {
				expression = new RegExp(`(?<!\w)${text}(?!\w)`, options);
			} else {
				expression = new RegExp(`${text}`, options);
			}
		}
		const references = [];
		for (let solution of this.solutions) {
			references.push(...solution.findReferences(expression));
		}
		return references;
	}
}

class Solution {
	constructor() {
	}

	build(name, filePath, solutionData) {
		this.id = solutionData["id"] ?? getUUID();
		this.name = name ?? solutionData["name"];
		this.filePath = filePath;
		this.type = solutionData["type"] ?? "flutter";
		this.landingScreen = solutionData["landingScreen"];
		this.screens = [];
		this.templates = [];
		this.components = [];
		this.controllers = [];
		this.graphs = [];
		this.types = [];
		this.folders = [];
		this.environmentData = new EnvironmentVariables(solutionData["environmentData"]);
		this.stringResources = new StringResources(solutionData["stringResources"]);

		if (solutionData["folders"]) {
			for (let entry of solutionData["folders"]) {
				const folder = new Folder(this.id, entry);
				this.folders.push(folder);
			}
		}
		if (solutionData["types"]) {
			for (let entry of solutionData["types"]) {
				const type = new TypeNode(this.id, entry);
				this.types.push(type);
			}
		}
		if (solutionData["graphs"]) {
			for (let entry of solutionData["graphs"]) {
				const graph = new Graph(this.id, entry);
				this.graphs.push(graph);
			}
		}
		if (solutionData["controllers"]) {
			for (let entry of solutionData["controllers"]) {
				const controller = new Controller(this.id, entry);
				this.controllers.push(controller);
			}
		}
		if (solutionData["templates"]) {
			for (let templateData of solutionData["templates"]) {
				const template = new Template(this.id, templateData);
				this.templates.push(template);
			}
		}
		if (solutionData["components"]) {
			for (let componentData of solutionData["components"]) {
				const component = new Component(this.id, componentData);
				this.components.push(component);
			}
		}
		if (solutionData["screens"]) {
			for (let screenData of solutionData["screens"]) {
				const screen = new Screen(this.id, screenData);
				this.screens.push(screen);
			}
		}
	}

	getId() {
		return this.id;
	}

	getScreen(screenId) {
		return this.screens.find(s => s.getId() === screenId)
			?? this.screens.find(s => s.getProperty("routeName") === screenId)
			?? null;
	}

	findWidget(widgetId) {
		let widget;
		for (let screen of this.screens) {
			widget = screen.findWidget(widgetId);
			if (widget)
				return widget;
		}
		return null;
	}

	getTemplate(id) {
		return id ? this.templates.find(e => e.getId() === id) : null;
	}

	findTemplates(widgetType) {
		if (widgetType) {
			return this.templates.filter(e => e.getType() === widgetType);
		}
		return null;
	}

	getComponent(id) {
		return id ? this.components.find(e => e.getId() === id) : null;
	}

	findComponents(widgetType) {
		if (widgetType) {
			return this.components.filter(e => e.getType() === widgetType);
		}
		return null;
	}

	getController(id) {
		return id ? this.controllers.find(e => e.getId() === id) : null;
	}

	getGraph(id) {
		return id ? this.graphs.find(e => e.getId() === id) : null;
	}

	getModels() {
		return this.types.filter(e => Schema.isModel(e.extends));
	}

	getModel(type) {
		if (type) {
			return this.getModels().find(e => e.getType() === type);
		}
		return null;
	}

	getRequests() {
		return this.types.filter(e => Schema.isRequest(e.extends));
	}

	getRequest(type) {
		if (type) {
			return this.getRequests().find(e => e.getType() === type);
		}
		return null;
	}

	createScreen() {
		const newScreen = new Screen(this.id, { _id: getUUID() });
		this.screens.push(newScreen);
		Editor.logInfo(`[Solution] New Screen '${newScreen.getName() || newScreen.getId()}' created on '${this.name}'.`, null, null, newScreen);
		return newScreen;
	}

	createTemplate(widgetType) {
		const newTemplate = Template.create(this.id, widgetType);
		this.templates.push(newTemplate);
		Editor.logInfo(`[Solution] New '${widgetType}' Template '${newTemplate.getName() || newTemplate.getId()}' created on '${this.name}'.`, null, null, newTemplate);
		return newTemplate;
	}

	createComponent(widgetType) {
		const newComponent = Component.create(this.id, widgetType);
		this.components.push(newComponent);
		Editor.logInfo(`[Solution] New '${widgetType}' Component '${newComponent.getName() || newComponent.getId()}' created on '${this.name}'.`, null, null, newComponent);
		return newComponent;
	}

	createController() {
		const newEntry = new Controller(this.id, { _id: getUUID(), _type: "Controller" });
		this.controllers.push(newEntry);
		Editor.logInfo(`[Solution] New Controller '${newEntry.getName() || newEntry.getId()}' created on '${this.name}'.`, null, null, newEntry);
		return newEntry;
	}

	createGraph(type) {
		const newEntry = new Graph(this.id, { _id: getUUID(), _type: type });
		this.graphs.push(newEntry);
		Editor.logInfo(`[Solution] New Graph '${newEntry.getName() || newEntry.getId()}' created on '${this.name}'.`, null, null, newEntry);
		return newEntry;
	}

	createModel() {
		const id = getUUID();
		const args = {
			_id: id,
			_type: id,
			extends: "KModel",
		};
		const newType = new TypeNode(this.id, args);
		this.types.push(newType);
		Editor.logInfo(`[Solution] New 'IModel' '${newType.getName() || newType.getId()}' created on '${this.name}'.`, null, null, newType);
		return newType;
	}

	createRequest() {
		const id = getUUID();
		const args = {
			_id: id,
			_type: id,
			extends: "KRequest",
		};
		const newType = new RequestNode(this.id, args);
		this.types.push(newType);
		Editor.logInfo(`[Solution] New 'Request' '${newType.getName() || newType.getId()}' created on '${this.name}'.`, null, null, newType);
		return newType;
	}

	createFolder() {
		const newFolder = new Folder(this.id, { _id: getUUID() });
		this.folders.push(newFolder);
		return newFolder;
	}

	removeRootNode(type, node) {
		const array = this._getTypeArray(type);
		if (array) {
			const idx = array.indexOf(node);
			if (idx >= 0) {
				array.splice(idx, 1);
				Editor.logInfo(`[Solution] '${type}' '${node.getName() || node.getId()}' removed from '${this.name}'.`, null, null, node);
			}
		}
	}

	cloneRootNode(type, node) {
		const array = this._getTypeArray(type);
		if (array) {
			const newNode = node.clone();
			array.push(newNode);
			Editor.logInfo(`[Solution] '${type}' '${newNode.getId()}' cloned from '${node.getName() || node.getId()}' on '${this.name}'.`, null, null, newNode);
			return newNode;
		}
		return null;
	}

	appendRootNode(type, node) {
		const array = this._getTypeArray(type);
		if (array) {
			node._solution = this.getId();
			array.push(node);
		}
	}

	canMoveUp(type, node) {
		const array = this._getTypeArray(type);
		if (array) {
			const folder = node.getFolder();
			const folderArray = array.filter((entry) => entry.getFolder() === folder);
			return folderArray.indexOf(node) > 0;
		}
		return false;
	}

	canMoveDown(type, node) {
		const array = this._getTypeArray(type);
		if (array) {
			const folder = node.getFolder();
			const folderArray = array.filter((entry) => entry.getFolder() === folder);
			return folderArray.indexOf(node) < folderArray.length - 1;
		}
		return false;
	}

	moveRootNode(type, node, direction) {
		const array = this._getTypeArray(type);
		if (array) {
			const idx = array.indexOf(node);
			if (idx >= 0) {
				const folder = node.getFolder();
				const folderArray = array.filter((entry) => entry.getFolder() === folder);
				const folderIdx = folderArray.indexOf(node);

				if (direction == "up" && this.canMoveUp(type, node)) {
					const prevIdx = array.indexOf(folderArray[folderIdx - 1]);
					array.splice(idx, 1);
					array.splice(prevIdx, 0, node);
				} else if (direction == "down" && this.canMoveDown(type, node)) {
					const nextIdx = array.indexOf(folderArray[folderIdx + 1]);
					array.splice(idx, 1);
					array.splice(nextIdx, 0, node);
				}
			}
		}
	}

	findReferences(expression) {
		const references = [];
		const rootNodes = [
			...this.screens,
			...this.templates,
			...this.components,
			...this.controllers,
			...this.graphs,
			...this.types,
		];
		for (let entry of rootNodes) {
			let refs = entry.findReferences(expression);
			if (refs) {
				references.push(refs);
			}
		}
		return references;
	}

	_getTypeArray(type) {
		switch (type) {
			case "screen":
				return this.screens;
			case "template":
				return this.templates;
			case "component":
				return this.components;
			case "controller":
				return this.controllers;
			case "graph":
				return this.graphs;
			case "type":
			case "model":
			case "request":
				return this.types;
			case "folder":
				return this.folders;
			default:
				return null;
		}
	}
}




function EnvironmentVariables(data) {
	this.environments = data?.environments ?? ["Dev", "QA", "Prod"];
	this.keys = data?.keys ?? [];
	this.values = data?.values ?? [];
}

function StringResources(data) {
	this.languages = data?.languages ?? ["en", "pt"];
	this.keys = data?.keys ?? [];
	this.values = data?.values ?? [];
}
