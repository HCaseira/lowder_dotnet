class Widget extends Node {
	constructor(solution, nodeData) {
		super(solution, nodeData);
	}

	get rootType() {
		return "Widget";
	}

	fromObject(objData) {
		super.fromObject(objData);
		if (!objData) {
			return;
		}

		const solutionId = this.getSolutionId();
		this.widgets = {};
		this._template = objData["_template"] ?? null;

		const props = objData["properties"] || {};
		const actions = objData["actions"] || {};
		const widgets = objData["widgets"] || {};

		if (this.isComponent()) {
			// Set this property before getting the schema, otherwise component exposed schema would not be loaded
			this.setProperty("component", props["component"]);
		}

		// Sanitize properties: only add existing properties in the schema
		const propSchema = this.getPropertySchema();
		for (let key in propSchema) {
			this.removeProperty(key);
		}
		for (let key in props) {
			if (propSchema[key]) {
				this.setProperty(key, props[key]);
			} else {
				console.warn(`Property ${key} not found in schema for type '${this.getType()}'`);
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

		// Sanitize widgets: only add existing widgets in the schema
		const widgetSchema = this.getWidgetSchema();
		for (let key in widgetSchema) {
			this.removeWidget(key);
		}

		for (let key in widgets) {
			if (!widgetSchema[key]) {
				continue;
			}

			let value = widgets[key];
			if (Array.isArray(value)) {
				let arr = [];
				this.widgets[key] = arr;
				for (let obj of value)
					arr.push(new Widget(solutionId, obj));
			} else {
				this.widgets[key] = new Widget(solutionId, widgets[key]);
			}
		}
	}

	getPropertySchema() {
		const schema = {};
		if (this.isComponent()) {
			const componentSchema = this._getComponentExposedSchema(this.getProperty("component"), "property");
			Object.assign(schema, componentSchema);
		}
		Object.assign(schema, super.getPropertySchema());
		return schema;
	}

	getActionSchema() {
		let schema = super.getActionSchema();
		if (this.isComponent()) {
			const componentSchema = this._getComponentExposedSchema(this.getProperty("component"), "action");
			schema = Object.assign(schema, componentSchema);
		}
		return schema;
	}

	getWidgetSchema() {
		let schema = Editor.project.getSchema(this.getSolutionId()).getWidgets(this);
		if (this.isComponent()) {
			const componentSchema = this._getComponentExposedSchema(this.getProperty("component"), "widget");
			schema = Object.assign(schema, componentSchema);
		}
		return schema;
	}

	_getComponentExposedSchema(componentId, schemaType) {
		if (componentId) {
			const component = Editor.project.getComponent(componentId);
			if (component) {
				return component.getExposedPropertiesOfType(schemaType);
			} else {
				console.error(`Component '${componentId}' not found`)
			}
		}
		return {};
	}

	getWidgets() {
		return this.widgets;
	}

	getWidget(key) {
		return this.widgets[key];
	}

	setWidget(key, widget) {
		this.widgets[key] = widget;
	}

	removeWidget(key) {
		delete this.widgets[key];
	}

	findWidget(widgetId) {
		if (widgetId === this.getId())
			return this;
		
		for (let key in this.widgets) {
			let value = this.widgets[key];
			if (Array.isArray(value)) {
				for (let entry of value) {
					let widget = entry.findWidget(widgetId);
					if (widget)
						return widget;
				}
			} else if (value) {
				let widget = value.findWidget(widgetId);
				if (widget)
					return widget;
			}
		}
		return null;
	}

	getTemplate() {
		return Editor.project.getTemplate(this._template);
	}

	setTemplate(templateId) {
		this._template = templateId;
	}

	isComponent() {
		return this.getType() === "WidgetComponent" || this.getType() === "PreferredSizeComponent";
	}

	isOfType(typeName) {
		typeName = typeName.replace("[", "").replace("]", "");
		return Editor.project.getSchema(this.getSolutionId()).getWidgetInheritance(this.getType()).includes(typeName);
	}

	clone() {
		var newObj = JSON.parse(stringify(this));
		delete newObj["_id"];
		const widgets = {};
		newObj["widgets"] = widgets;
		const actions = {};
		newObj["actions"] = actions;

		let props = this.getWidgets();
		for (let key in props) {
			let prop = this.getWidget(key);
			if (prop instanceof Widget) {
				widgets[key] = prop.clone();
			} else if (Array.isArray(prop)) {
				let arr = [];
				widgets[key] = arr;
				for (let i = 0; i < prop.length; i++) {
					if (prop[i] instanceof Widget) {
						arr[i] = prop[i].clone();
					}
				}
			}
		}

		props = this.getActions();
		for (let key in props) {
			let prop = props[key];
			if (prop instanceof Action) {
				actions[key] = prop.clone();
			}
		}

		return this.createInstanceFromMap(this.getSolutionId(), newObj);
	}

	createInstanceFromMap(solutionId, objData) {
		return new Widget(solutionId, objData);
	}

	static create(solutionId, type) {
		return new Widget(solutionId, { _type: type });
	}
}



class WidgetDerivative extends Widget {
	constructor(solution, nodeData) {
		super(solution, nodeData);
		this.isRootNode = true;
		this._folder = this._folder ?? null;
		this.name = this.name ?? null;
	}

	fromObject(props) {
		super.fromObject(props);
		if (props) {
			this._folder = props["_folder"];
			this.name = props["name"];
		}
	}

	getFolder() {
		return this._folder;
	}

	setFolder(value) {
		this._folder = value;
	}

	getName() {
		return this.name;
	}

	setName(name) {
		this.name = name;
	}
}



class Template extends WidgetDerivative {
	constructor(solution, nodeData) {
		super(solution, nodeData);
	}

	getFriendlyType() {
		return "Template";
	}

	createInstanceFromMap(solutionId, objData) {
		return new Template(solutionId, objData);
	}

	setTemplate(templateId) {
		if (templateId !== this.getId()) {
			super.setTemplate(templateId);
		}
	}

	static create(solutionId, type) {
		return new Template(solutionId, { _type: type });
	}
}



class Component extends WidgetDerivative {
	constructor(solution, nodeData) {
		super(solution, nodeData);
	}

	fromObject(data) {
		super.fromObject(data);
		if (data) {
			this.exposedProperties = data["exposedProperties"] || {};
		}
	}

	getFriendlyType() {
		return "Component";
	}

	createInstanceFromMap(solutionId, objData) {
		return new Component(solutionId, objData);
	}

	getExposedPropertiesOfType(type) {
		const schema = {};
		// format: <widgetId>.<type(action, property, widget)>.key
		for (let key in this.exposedProperties) {
			let val = this.exposedProperties[key];
			if (val.split(".")[1] !== type) {
				continue;
			}

			let widgetId = val.split(".")[0];
			let widget = this.findWidget(widgetId);
			let widgetPropertyKey = val.replace(`${widgetId}.${type}.`, "");

			let childSchema;
			switch (type) {
				case "action":
					childSchema = widget.getActionSchema();
					break;
				case "property":
					childSchema = widget.getPropertySchema();
					break;
				case "widget":
					childSchema = widget.getWidgetSchema();
					break;
				default:
					continue;
			}

			if (childSchema[widgetPropertyKey]) {
				schema[key] = childSchema[widgetPropertyKey];
			}
		}
		return schema;
	}

	static create(solutionId, type) {
		return new Component(solutionId, { _type: type });
	}

	canExposeProperties() {
		return true;
	}
}
