class Endpoint extends RootNode {
	constructor(solution, nodeData) {
		super(solution, nodeData);
	}

	get rootType() {
		return "Endpoint";
	}

	fromObject(objData) {
		super.fromObject(objData);
		if (!objData) {
			return;
		}

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
			} else {
				Editor.logWarn(`Property ${key} not found in schema for type '${this.getType()}'`);
			}
		}

		// Sanitize actions: only add existing actions in the schema
		const actionSchema = this.getActionSchema();
		for (let key in actionSchema) {
			this.removeAction(key);
		}
		for (let key in actions) {
			if (actionSchema[key]) {
				this.setAction(key, new Action(solutionId, actions[key]));
			}
		}
	}

	clone() {
		var newObj = JSON.parse(stringify(this));
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

		return this.createInstanceFromMap(this.getSolutionId(), newObj);
	}

	createInstanceFromMap(solutionId, objData) {
		return new Endpoint(solutionId, objData);
	}

	static create(solutionId, type) {
		return new Endpoint(solutionId, { _type: type });
	}
}


class Controller extends Endpoint {
	constructor(solution, nodeData) {
		super(solution, nodeData);
	}

	get rootType() {
		return "Controller";
	}

	createInstanceFromMap(solutionId, objData) {
		return new Controller(solutionId, objData);
	}

	static create(solutionId, type) {
		return new Controller(solutionId, { _type: type });
	}
}

class Graph extends Endpoint {
	constructor(solution, nodeData) {
		super(solution, nodeData);
	}

	get rootType() {
		return "Graph";
	}

	createInstanceFromMap(solutionId, objData) {
		return new Graph(solutionId, objData);
	}

	static create(solutionId, type) {
		return new Graph(solutionId, { _type: type });
	}
}