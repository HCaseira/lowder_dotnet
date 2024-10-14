class Node {
	constructor(solution, nodeData) {
		this._solution = solution;
		this._id = getUUID();
		this._type = null;
		this.name = null;
		this.properties = {};
		this.actions = {};
		this.fromObject(nodeData);
	}

	fromObject(nodeData) {
		if (nodeData) {
			this._id = nodeData["_id"] ?? this.getId();
			this._type = nodeData["_type"] ?? this.getType();
			this.name = nodeData["name"] ?? this.getName();
		}
	}

	getSolutionId() {
		return this._solution;
	}

	getId() {
		return this._id;
	}

	getType() {
		return this._type;
	}

	getFriendlyType() {
		return this.getType();
	}

	get rootType() {
		return null;
	}

	getName() {
		return this.name;
	}

	setName(name) {
		this.name = name;
	}

	getSchema() {
		return Editor.project.getSchema(this.getSolutionId()).getSchema(this);
	}

	getActions() {
		return this.actions;
	}

	getActionSchema() {
		return Editor.project.getSchema(this.getSolutionId()).getActions(this);
	}

	getAction(key) {
		return this.actions[key];
	}

	setAction(key, action) {
		this.actions[key] = action;
	}

	removeAction(key) {
		delete this.actions[key];
	}

	getProperties() {
		return this.properties;
	}

	getPropertySchema() {
		return Editor.project.getSchema(this.getSolutionId()).getProperties(this);
	}

	getProperty(key) {
		return this.properties[key];
	}

	setProperty(key, value) {
		this.properties[key] = value;
	}

	removeProperty(key) {
		delete this.properties[key];
	}

	findReferences(text) {
		return this._findNodeReferences(text, this);
	}

	_findNodeReferences(expression, node) {
		const references = { }
		for (let key in node) {
			let refs = this._findValueReferences(expression, node[key]);
			if (refs) {
				references[key] = refs;
			}
		}
		if (Object.keys(references).length > 0) {
			return new NodeReference(this, references);
		}
		return null;
	}

	_findValueReferences(expression, val) {
		if (!val) {
			return null;
		}

		let refs, res;
		if (val instanceof Node) {
			return val._findNodeReferences(expression, val);
		} else if (Array.isArray(val)) {
			refs = [];
			for (let entry of val) {
				res = this._findValueReferences(expression, entry);
				if (res) {
					refs.push(res);
				}
			}
			return refs.length > 0 ? refs : null;
		} else if (typeof val === 'object') {
			refs = {};
			for (let key in val) {
				res = this._findValueReferences(expression, val[key]);
				if (res) {
					refs[key] = res;
				}
			}
			return Object.keys(refs).length > 0 ? refs : null;
		} else {
			if (expression.test(`${val}`)) {
				return val;
			}
			return null;
		}
	}

	canExposeProperties() {
		return false;
	}
}


class RootNode extends Node {
	constructor(solution, nodeData) {
		super(solution, nodeData);
		this.isRootNode = true;
	}

	fromObject(data) {
		super.fromObject(data);
		if (data) {
			this._folder = data["_folder"];
		}
	}

	getFolder() {
		return this._folder ?? null;
	}

	setFolder(value) {
		this._folder = value;
	}
}


class Folder extends RootNode {
	constructor(solution, nodeData) {
		super(solution, nodeData);
		this._type = this._type ?? "Folder";
	}

	setFolder(value) {
		if (value !== this.getId()) {
			super.setFolder(value);
		}
	}
}


class TypeNode extends RootNode {
	constructor(solution, nodeData) {
		super(solution, nodeData);
	}

	fromObject(data) {
		super.fromObject(data);
		if (data) {
			this.extends = data["extends"];
			const props = data["properties"] || {};
			for (let key in props) {
				this.setProperty(key, props[key]);
			}
		}
	}

	getName() {
		return super.getName() ?? this.getId();
	}

	getType() {
		return this.getId();
	}

	getFriendlyType() {
		return Schema.isRequest(this.extends) ? "Request" : "Model";
	}

	get rootType() {
		return "Type";
	}

	clone() {
		const newObj = JSON.parse(stringify(this));
		delete newObj["_id"];
		delete newObj["_type"];
		return new TypeNode(this.getSolutionId(), newObj);
	}
}

class RequestNode extends TypeNode {
	constructor(solution, nodeData) {
		super(solution, nodeData);
	}

	clone() {
		const newObj = JSON.parse(stringify(this));
		delete newObj["_id"];
		delete newObj["_type"];
		return new RequestNode(this.getSolutionId(), newObj);
	}
}


class Action extends Node {
	constructor(solution, nodeData) {
		super(solution, nodeData);
	}

	get rootType() {
		return "Action";
	}

	fromObject(objData) {
		super.fromObject(objData);
		const solutionId = this.getSolutionId();
		const props = objData["properties"] || {};
		const actions = objData["actions"] || {};

		// Sanitize properties: only add existing properties in the schema
		const propSchema = this.getPropertySchema();
		for (let key in propSchema) {
			this.removeProperty(key);
		}
		for (let key in props) {
			if (propSchema[key]) {
				this.setProperty(key, props[key]);
			}
		}

		// Check if any action is of type 'ActionNodeMap'
		// If so, accept all keys
		const actionSchema = this.getActionSchema();
		let hasActionMap = false;
		for (let key in actionSchema) {
			if (actionSchema[key] === "ActionNodeMap") {
				hasActionMap = true;
				break;
			}
		}

		// Sanitize actions: only add existing actions in the schema
		for (let key in actionSchema) {
			this.removeAction(key);
		}
		for (let key in actions) {
			if (hasActionMap || actionSchema[key]) {
				this.setAction(key, new Action(solutionId, actions[key]));
			}
		}
	}

	clone() {
		const newObj = JSON.parse(stringify(this));
		delete newObj["_id"];
		const actions = {};
		newObj["actions"] = actions;

		const props = this.getActions();
		for (let key in props) {
			let prop = props[key];
			if (prop instanceof Action) {
				actions[key] = prop.clone();
			}
		}

		return new Action(this.getSolutionId(), newObj);
	}
}


class NodeReference {
	constructor(node, references) {
		this.node = node;
		this.references = references;
	}
}