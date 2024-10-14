class Schema {
	constructor(solutionId, schemaData) {
		this.solutionId = solutionId;
		this.widgets = schemaData.widgets ?? {};
		this.controllers = schemaData.controllers ?? {};
		this.graphs = schemaData.graphs ?? {};
		this.actions = schemaData.actions ?? {};
		this.properties = schemaData.properties ?? {};

		this.widgetTypes = {};
		for (let widget in this.widgets) {
			let types = this.getWidgetInheritance(widget);
			for (let type of types) {
				if (!this.widgetTypes[type]) {
					this.widgetTypes[type] = [];
				}
				this.widgetTypes[type].push({
					"type": widget,
					"spec": this.widgets[widget]
				});
			}
		}

		this.propertyTypes = {};
		for (let prop in this.properties) {
			let types = this.getPropertyInheritance(prop);
			for (let type of types) {
				if (!this.propertyTypes[type]) {
					this.propertyTypes[type] = [];
				}
				this.propertyTypes[type].push({
					"type": prop,
					"spec": this.properties[prop]
				});
			}
		}
	}

	_getTypeSchema(rootType) {
		switch (rootType.toLowerCase()) {
			case "widget":
			case "widgets":
				return this.widgets;
			case "controller":
			case "controllers":
				return this.controllers;
			case "graph":
			case "graphs":
				return this.graphs;
			case "action":
			case "actions":
			case "iaction":
			case "kaction":
			case "ilistaction":
			case "klistaction":
				return this.actions;
			default:
				const props = {...this.properties};
				for (let type of Editor.project.getTypes(this.solutionId)) {
					props[type.getType()] = type;
				}
				return props;
		}
	}

	getSchema(node) {
		if (!node || !(node instanceof Node) || node instanceof Folder)
			return null;

		return this._getTypeSchema(node.rootType)[node.getType()];
	}

	getWidgets(node) {
		if (!node || !(node instanceof Node) || node instanceof Folder)
			return null;
		
		const typeName = node.getType();
		const schema = this._getTypeSchema(node.rootType);
		const type = schema[typeName];
		if (!type)
			return null;
		if (Array.isArray(type))
			return type;

		const typeWidgets = type.widgets || {};
		const widgets = {};

		let baseTypeName = type["extends"];
		while (baseTypeName) {
			const baseType = schema[baseTypeName];
			if (!baseType) {
				break;
			}

			let baseWidgets = baseType.widgets || {};
			for (const key in baseWidgets) {
				widgets[key] = baseWidgets[key];
			}
			baseTypeName = baseType["extends"];
		}
		
		for (const key in typeWidgets) {
			widgets[key] = typeWidgets[key];
		}
		return widgets;
	}

	getActions(node) {
		if (!node || !(node instanceof Node) || node instanceof Folder)
			return null;
		
		const typeName = node.getType();
		const schema = this._getTypeSchema(node.rootType);
		const type = schema[typeName];
		if (!type)
			return null;
		if (Array.isArray(type))
			return type;

		const typeActions = type.actions || {};
		const actions = {};

		let baseTypeName = type["extends"];
		while (baseTypeName) {
			const baseType = schema[baseTypeName];
			if (!baseType) {
				break;
			}

			let baseActions = baseType.actions || {};
			for (const key in baseActions) {
				actions[key] = baseActions[key];
			}
			baseTypeName = baseType["extends"];
		}
		
		for (const key in typeActions) {
			actions[key] = typeActions[key];
		}
		return actions;
	}

	getProperties(node) {
		if (!node || !(node instanceof Node) || node instanceof Folder)
			return null;

		const schema = this._getTypeSchema(node.rootType);
		return this._getPropertyProperties(schema, node.getType());
	}

	getPropertyProperties(typeName) {
		const schema = this._getTypeSchema("properties");
		return this._getPropertyProperties(schema, typeName);
	}

	_getPropertyProperties(schema, typeName) {
		const type = schema[typeName];
		if (!type)
			return null;
		if (Array.isArray(type))
			return type;

		const typeProperties = type.properties || {};
		const properties = {};

		let baseTypeName = type["extends"];
		const isModel = Schema.isRequest(baseTypeName) || Schema.isModel(baseTypeName);
		if (isModel) {
			for (const key in typeProperties) {
				properties[key] = typeProperties[key];
			}
		}

		while (baseTypeName) {
			const baseType = schema[baseTypeName];
			if (!baseType) {
				break;
			}

			let baseProperties = baseType.properties || {};
			for (const key in baseProperties) {
				properties[key] = baseProperties[key];
			}
			baseTypeName = baseType["extends"];
		}

		if (!isModel) {
			for (const key in typeProperties) {
				properties[key] = typeProperties[key];
			}
		}
		
		return properties;
	}

	getTypes(rootType, typeName) {
		if (!rootType) {
			return [];
		}
		if (!typeName) {
			typeName = "";
		}

		const schema = this._getTypeSchema(rootType);
		const results = [];
		typeName = typeName.replace("[", "").replace("]", "");
		const returnAll = typeName.length === 0;

		for (let key in schema) {
			let type = schema[key];
			if (type.abstract) {
				continue;
			}
			if (returnAll || key === typeName) {
				results.push(key);
			} else {
				let subType = type.extends;
				while (subType) {
					if (subType == typeName) {
						results.push(key);
						break;
					}
					subType = schema[subType]?.extends;
				}
			}
		}
		return results;
	}

	getWidgetTypes(typeName) {
		return this.getTypes("widget", typeName);
	}

	getActionTypes(typeName) {
		return this.getTypes("action", typeName);
	}

	getPropertyTypes(typeName) {
		return this.getTypes("property", typeName);
	}

	getPropertyInheritance(typeName) {
		const types = [];
		const type = this.properties[typeName];
		if (type) {
			types.push(typeName);
			let base = type["extends"];
			while (base) {
				types.push(base);
				let baseType = this.properties[base];
				if (baseType) {
					base = baseType["extends"];
				} else {
					base = null;
				}
			}
		}
		return types;
	}

	getPropertiesOfType(typeName) {
		if (!typeName)
			return [];

		const results = [];
		typeName = typeName.replace("[", "").replace("]", "");

		if (this.propertyTypes.hasOwnProperty(typeName)) {
			for (let type of this.propertyTypes[typeName]) {
				if (type.spec["abstract"]) {
					continue;
				}
				results.push(type.type);
			}
		}
		return results;
	}
	
	getWidgetInheritance(typeName) {
		const types = [];
		const type = this.widgets[typeName];
		if (type) {
			types.push(typeName);
			let base = type["extends"];
			while (base) {
				types.push(base);
				let baseType = this.widgets[base];
				if (baseType) {
					base = baseType["extends"];
				} else {
					base = null;
				}
			}
		}
		return types;
	}

	getWidgetsOfType(typeName) {
		typeName = typeName || "Widget";
		const results = [];
		typeName = typeName.replace("[", "").replace("]", "");

		if (this.widgetTypes.hasOwnProperty(typeName)) {
			for (let type of this.widgetTypes[typeName]) {
				if (type.spec["abstract"]) {
					continue;
				}
				results.push(type.type);
			}
		}
		return results;
	}

	getWidgetsWithProperties(widgetType, targetProperties, propertyType) {
		const results = [];
		const widgets = this.widgetTypes[widgetType];
		const widgetTypes = [propertyType, "[" + propertyType + "]"];

		for (let widget of widgets) {
			if (widget.spec["abstract"]) {
				continue;
			}

			let objectsToSearch = [
				widget.spec.properties,
				widget.spec.actions,
				widget.spec.widgets
			];

			for (let obj of objectsToSearch) {
				if (obj) {
					for (let targetProperty of targetProperties) {
						if (obj.hasOwnProperty(targetProperty) && widgetTypes.indexOf(obj[targetProperty]) >= 0) {
							results.push(widget.type);
							break;
						}
					}
				}
			}
		}
		return results;
	}

	isWidget(typeName) {
		if (typeof typeName != "string" || typeName === "Screen") {
			return false;
		}

		typeName = typeName.replace("[", "").replace("]", "");
		return this.widgetTypes.hasOwnProperty(typeName);
	}
	
	isAction(typeName) {
		if (typeof typeName != "string") {
			return false;
		}

		typeName = typeName.replace("[", "").replace("]", "");
		return this.actions.hasOwnProperty(typeName);
	}

	static isModel(typeName) {
		return typeName === "KModel" || typeName === "IModel";
	}

	static isRequest(typeName) {
		return typeName === "KRequest" || typeName === "IRequest";
	}
}
