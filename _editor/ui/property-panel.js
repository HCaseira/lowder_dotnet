class PropertyPanel extends EditorPanel {
	constructor() {
		super();
		this.id = "property-panel";
		this.modelNode;
	}

	populate() {
		const rootPanel = document.getElementById(this.id);
		rootPanel.innerHTML = "";
		this.modelNode = null;
		this.solutionId = null;
		this.solutionSchema = null;
	}

	selectNode(node) {
		this.modelNode = node;
		this.solutionId = node.getSolutionId();
		this.solutionSchema = Editor.project.getSchema(this.solutionId);

		const schemaProperties = node.getPropertySchema() ?? {};
		const nodeProperties = node.getProperties();
		const template = (node.getTemplate ? node.getTemplate()?.getProperties() : {}) ?? {};

		const rootPanel = document.getElementById(this.id);
		rootPanel.innerHTML = "";
		this.buildHeader(rootPanel, node);

		if (node instanceof TypeNode && Schema.isModel(node["extends"])) {
			this.buildTypePropertyEditor(rootPanel, node);
		} else {
			for (let key in schemaProperties) {
				if (this.solutionSchema.isWidget(schemaProperties[key]) || this.solutionSchema.isAction(schemaProperties[key])) {
					continue;
				}
				this.createPropertyElement(rootPanel, key, schemaProperties[key], nodeProperties, template);
			}

			if (node.canExposeProperties()) {
				// Allow user to expose properties from Component's widgets
				this.buildComponentPropertyEditor(rootPanel, node);
			}
		}
	}

	buildHeader(rootElement, node) {
		const holder = document.createElement("div");
		holder.className = this.id + "-item-header";
		rootElement.appendChild(holder);

		const nameElement = document.createElement("input");
		nameElement.className = this.id + "-item-header-name";
		nameElement.value = node.getName() ?? "";
		nameElement.onchange = () => {
			this.logInfo(`name updated to ${nameElement.value}.`);
			node.setName(nameElement.value);
			Editor.onNodeUpdated(this.id, node);
		};
		holder.appendChild(nameElement);

		const typeElement = document.createElement("span");
		typeElement.className = this.id + "-item-header-type";
		if (!(node instanceof TypeNode)) {
			typeElement.innerHTML = node.getType();
		}
		holder.appendChild(typeElement);
		
		if (node.isRootNode) {
			const folderTitle = document.createElement("span");
			folderTitle.className = this.id + "-item-header-prop-name";
			folderTitle.innerHTML = "Folder";

			const folderSelector = document.createElement("select");
			folderSelector.className = this.id + "-item-header-prop-value";

			let option = document.createElement("option");
			option.setAttribute("value", null);
			option.innerHTML = "";
			folderSelector.appendChild(option);
			for (let folder of Editor.project.getFolders(this.solutionId)) {
				option = document.createElement("option");
				option.value = folder.getId();
				option.innerHTML = folder.getName();
				folderSelector.appendChild(option);
			}
			folderSelector.value = node.getFolder();
			folderSelector.onchange = () => {
				node.setFolder(folderSelector.value);
				Editor.onNodeUpdated(this.id, node);
				this.logInfo(`folder updated to ${folderSelector.value}.`);
			};

			const folderRow = document.createElement("row");
			folderRow.className = this.id + "-item-header-prop";
			folderRow.appendChild(folderTitle);
			folderRow.appendChild(folderSelector);
			rootElement.appendChild(folderRow);
		}

		const idTitle = document.createElement("div");
		idTitle.className = this.id + "-item-header-prop-name";
		idTitle.innerHTML = "Id";

		const idValue = document.createElement("div");
		idValue.className = this.id + "-item-header-prop-value";
		idValue.innerHTML = node.getId();

		const idRow = document.createElement("row");
		idRow.className = this.id + "-item-header-prop";
		idRow.appendChild(idTitle);
		idRow.appendChild(idValue);
		rootElement.appendChild(idRow);

		if (node.isRootNode) {
			const searchButton = document.createElement("icon");
			searchButton.classList.add("material-symbols-outlined");
			searchButton.classList.add(this.id + "-item-header-button");
			searchButton.innerText = "search";
			searchButton.setAttribute("title", "Find references");
			searchButton.onclick = () => Editor.doSearch(node.getId());
			idRow.appendChild(searchButton);
		}

		const separatorElement = document.createElement("div");
		separatorElement.className = this.id + "-item-header-separator";
		rootElement.appendChild(separatorElement);
	}

	buildComponentPropertyEditor(rootElement, node) {
		const holder = document.createElement("column");
		holder.className = this.id + "-table";
		rootElement.appendChild(holder);

		// Build a list with all Widgets, its actions, properties and widgets, composing this Component
		const widgets = [];
		const widgetNames = {};
		const widgetActionMap = {};
		const widgetPropertyMap = {};
		const widgetWidgetMap = {};
		const queue = [node];
		while (queue.length > 0) {
			let widget = queue.shift();
			let widgetId = widget.getId();
			let widgetName = widget.getName();
			if (widgetName && widgetId !== widgetName) {
				// For simplification, only named widgets will be available
				widgets.push(widget);
				widgetNames[widgetId] = widgetName;
				widgetActionMap[widgetId] = widget.getActionSchema();
				widgetPropertyMap[widgetId] = widget.getPropertySchema();
				widgetWidgetMap[widgetId] = widget.getWidgetSchema();
			}

			let children = widget.getWidgets();
			for (let key in children) {
				let keyVal = children[key];
				if (Array.isArray(keyVal)) {
					queue.push(...keyVal);
				} else {
					queue.push(keyVal);
				}
			}
		}

		// TODO: account for Components with other Components inside
		// show their exposed properties
		const props = node.exposedProperties;
		for (let key in props) {
			let row = this.createComponentPropertyEditorRow(props, key, widgetNames, widgetActionMap, widgetPropertyMap, widgetWidgetMap);
			holder.appendChild(row);
		}

		const addRow = this.createComponentPropertyEditorRow(props, null, widgetNames, widgetActionMap, widgetPropertyMap, widgetWidgetMap);
		holder.appendChild(addRow);
	}

	createComponentPropertyEditorRow(props, key, widgetNames, widgetActionMap, widgetPropertyMap, widgetWidgetMap) {
		const holder = document.createElement("row");
		holder.className = this.id + "-item";

		if (key) {
			const value = props[key];
			const keyElement = this.createPropertyNameElement(key, value !== null && value !== undefined);
			holder.append(keyElement);

			if (value) {
				// TODO: value should be something like <widgetId>.<type(action, property, widget)>.key
				// Replace widgetId with its name to be more user-friendly
				const parts = value.split(".");
				parts[0] = widgetNames[parts[0]] ?? parts[0];
				const valueElement = this.createPropertyNameElement(parts.join("."), true);
				holder.append(valueElement);
			} else {
				// 1. Select Widget (self or a child)
				// 2. Select:
				//		a property (no need no navigate through properties)
				//		a widget placeholder
				//		an action

				let finalValue;
				const selectWidget = () => {
					const selectWidgetList = [];
					for (let key in widgetNames) {
						selectWidgetList.push({id: key, name: widgetNames[key]});
					}
					showModalList(null, selectWidgetList, (val) => {
						finalValue = val.id;
						selectType(val.id);
					});
				};
				const selectType = (widgetId) => {
					const selectTypes = [];
					if (widgetPropertyMap[widgetId]) selectTypes.push("property");
					if (widgetWidgetMap[widgetId]) selectTypes.push("widget");
					if (widgetActionMap[widgetId]) selectTypes.push("action");
					showModalList(null, selectTypes, (val) => {
						finalValue += `.${val}`;
						switch(val) {
							case "property":
								selectKey(widgetPropertyMap[widgetId]);
								break;
							case "widget":
								selectKey(widgetWidgetMap[widgetId]);
								break;
							case "action":
								selectKey(widgetActionMap[widgetId]);
								break;
						}
					});
				};
				const selectKey = (map) => {
					showModalList(null, Object.keys(map), (val) => {
						finalValue += `.${val}`;
						props[key] = finalValue;
						Editor.onNodeUpdated(this.id, this.modelNode);
						this.selectNode(this.modelNode);
					});
				};

				const valueElement = document.createElement("input");
				valueElement.onclick = selectWidget;
				valueElement.value = key ? props[key] ?? null : null;
				valueElement.className = this.id + "-item-value";
				holder.append(valueElement);
			}
			
			const deleteElement = document.createElement("span");
			deleteElement.innerHTML = "delete";
			deleteElement.className = this.id + "-item-delete material-symbols-outlined";
			deleteElement.onclick = () => {
				delete props[key];
				this.selectNode(this.modelNode);
			};
			holder.append(deleteElement);
		} else {
			const keyElement = document.createElement("input");
			keyElement.className = this.id + "-item-value";
			keyElement.setAttribute("placeholder", "Add property");
			keyElement.onchange = () => {
				if (!keyElement.value) {
					return;
				}
				if (props.hasOwnProperty(keyElement.value)) {
					showModalError("Error", `Key '${keyElement.value}' already exists.`);
				} else {
					props[keyElement.value] = null;
					this.selectNode(this.modelNode);
				}
			};
			holder.append(keyElement);
		}

		return holder;
	}

	buildTypePropertyEditor(rootElement, node) {
		const holder = document.createElement("div");
		holder.className = this.id + "-table";
		rootElement.appendChild(holder);

		const props = node.properties;
		for (let key in props) {
			let row = this.createTypePropertyEditorRow(props, key);
			holder.appendChild(row);
		}

		// Empty row to add a new property
		const addRow = this.createTypePropertyEditorRow(props, null);
		holder.appendChild(addRow);
	}

	createTypePropertyEditorRow(props, key) {
		const holder = document.createElement("div");
		holder.className = this.id + "-item";

		if (!key) {
			const keyElement = document.createElement("input");
			keyElement.className = this.id + "-item-value";
			keyElement.setAttribute("placeholder", "Add property");
			keyElement.onchange = () => {
				if (keyElement.value) {
					props[keyElement.value] = null;
					this.selectNode(this.modelNode);
				}
			};
			holder.append(keyElement);
		} else {
			const value = props[key];
			const keyElement = this.createPropertyNameElement(key, value !== null && value !== undefined);
			holder.append(keyElement);

			const valueElement = document.createElement("input");
			valueElement.value = key ? props[key] ?? null : null;
			valueElement.className = this.id + "-item-value";
			valueElement.onchange = () => {
				this.logInfo(`${key} updated: ${props[key]} -> ${valueElement.value}.`);
				props[key] = valueElement.value;
				Editor.onNodeUpdated(this.id, this.modelNode);
			};
			holder.append(valueElement);

			const deleteElement = document.createElement("span");
			deleteElement.innerHTML = "delete";
			deleteElement.className = this.id + "-item-delete material-symbols-outlined";
			deleteElement.onclick = () => {
				delete props[key];
				this.selectNode(this.modelNode);
			};
			holder.append(deleteElement);
		}
		return holder;
	}

	createPropertyElement(rootElement, key, type, nodeProperties, template) {
		const holder = document.createElement("div");
		holder.className = this.id + "-item";
		rootElement.appendChild(holder);

		const value = nodeProperties[key];
		let isEmpty = value === null || value === undefined;
		if (!isEmpty) {
			if (Array.isArray(value)) {
				isEmpty = value.length === 0;
			} else if (value.constructor === Object) {
				isEmpty = Object.keys(value).length === 0;
			}
		}
		holder.appendChild(this.createPropertyNameElement(key, !isEmpty));
		const result = this.createPropertyValueElement(rootElement, key, type, nodeProperties, template);

		const elements = Array.isArray(result) ? result : [result];
		for (let i = 0; i < elements.length; i++) {
			holder.appendChild(elements[i]);
		}
	}

	createPropertyNameElement(name, hasValue) {
		const nameElement = document.createElement("label");
		nameElement.className = this.id + "-item-name ";
		if (hasValue)
			nameElement.className += this.id + "-item-name-filled";
		nameElement.innerHTML = name;
		return nameElement;
	}

	createPropertyValueElement(rootElement, key, type, nodeProperties, template) {
		if (Array.isArray(type)) {
			return this.createPropertyValueSelectElement(type, key, nodeProperties, template);
		}
		if (this.solutionSchema.properties[type] && this.solutionSchema.properties[type]["abstract"]) {
			return this.createPropertyValueCompoundSelectionElement(rootElement, type, key, nodeProperties, template);
		}
		if (type.startsWith("[") && type.endsWith("]")) {
			return this.createPropertyValueArrayElement(rootElement, key, type, nodeProperties);
		}
		const typeProperties = this.solutionSchema.getPropertyProperties(type);
		if (!typeProperties || Object.keys(typeProperties).length === 0) {
			if (type === "Json") {
				return this.createPropertyValueJsonElement(rootElement, nodeProperties, key);
			} else {
				return this.createPropertyValueInputElement(type, key, nodeProperties, template);
			}
		}
		if (Array.isArray(typeProperties)) {
			return this.createPropertyValueSelectElement(typeProperties, key, nodeProperties, template);
		}

		const storageKey = `prop_${this.modelNode.getId()}_${key}`;
		const subElement = this.createPropertyValueCompoundElement(typeProperties, key, nodeProperties, template);
		rootElement.appendChild(subElement);
		if (!localStorage.getItem(storageKey)) {
			subElement.classList.add("hidden");
		}

		const valueElement = document.createElement("div");
		valueElement.className = this.id + "-item-expandable";
		valueElement.innerHTML = "+";
		valueElement.onclick = (e) => {
			subElement.classList.toggle("hidden");
			if (localStorage.getItem(storageKey)) {
				localStorage.removeItem(storageKey);
			} else {
				localStorage.setItem(storageKey, true);
			}
		};
		return valueElement;
	}

	createPropertyValueArrayElement(rootElement, key, type, nodeProperties) {
		const types = [];
		const propTypes = this.solutionSchema.getPropertiesOfType(type);
		for (let propType of propTypes) {
			types.push({ type: propType, name: propType });
		}

		var values = nodeProperties[key] ?? [];
		nodeProperties[key] = values;

		const addButton = document.createElement("column");
		addButton.className = this.id + "-item-expandable";
		addButton.innerHTML = "+";
		addButton.onclick = (e) => {
			if (types.length > 0) {
				showModalList(null, types, (selectedType) => {
					values.push({"_type": selectedType.type});
					this.updateNodeValue(nodeProperties, key, values);
					this.selectNode(this.modelNode);
				}, "Select a type to add");
			} else {
				values.push("");
				this.updateNodeValue(nodeProperties, key, values);
				this.selectNode(this.modelNode);
			}
		};

		
		if (values && values.length > 0) {
			const valueElement = document.createElement("column");
			valueElement.classList.add(this.id + "-arrayitem");
			valueElement.classList.add(this.id + "-subitem");
			rootElement.appendChild(valueElement);

			const createChildElement = (idx) => {
				// TODO: type can be of any kind, not only a Property. Ex: [String]
				const childValue = values[idx];

				const deleteButton = document.createElement("span");
				deleteButton.innerText = "delete";
				deleteButton.classList.add("material-symbols-outlined");
				deleteButton.onclick = () => {
					values.splice(idx, 1)
					this.updateNodeValue(nodeProperties, key, values);
					this.selectNode(this.modelNode);
				};

				const label = document.createElement("span");
				const header = document.createElement("row");
				header.classList.add(this.id + "-arrayitem-header");
				header.append(label);
				header.append(deleteButton);
				valueElement.appendChild(header);

				let childType;
				if (typeof childValue === 'object' && !Array.isArray(childValue)) {
					childType = childValue["_type"];
					label.innerText = childType;
				}
				childType ??= "String";

				var result = this.createPropertyValueElement(valueElement, idx, childType, values, {});
				if (result instanceof HTMLElement && result.classList.contains("property-panel-item-value")) {
					header.prepend(result);
				} else {
					const elements = Array.isArray(result) ? result : [result];
					for (let h = 0; h < elements.length; h++) {
						valueElement.appendChild(elements[h]);
					}
				}
			};

			for (let i = 0; i < values.length; i++) {
				createChildElement(i);
			}
			for (let elem of valueElement.children) {
				elem.classList.remove("hidden");
			}
		}

		return addButton;
	}

	createPropertyValueCompoundElement(type, key, nodeProperties, template) {
		if (!nodeProperties[key]) {
			nodeProperties[key] = {};
		}
		const value = nodeProperties[key];
		const templateValue = template[key] ?? {};
		const valueElement = document.createElement("div");
		valueElement.className = this.id + "-subitem";
		const properties = type;
		for (const key in properties) {
			if (this.shouldShowProperty(properties[key])) {
				this.createPropertyElement(valueElement, key, properties[key], value, templateValue);
			}
		}
		return valueElement;
	}

	createNodeValueElement(node) {
		const valueElement = document.createElement("div");
		valueElement.className = this.id + "-subitem";

		let schema = node.getPropertySchema();
		for (let key in schema) {
			this.createPropertyElement(valueElement, key, schema[key], node.getProperties(), {});
		}
		schema = node.getActionSchema();
		for (let key in schema) {
			this.createPropertyElement(valueElement, key, schema[key], node.getActions(), {});
		}
		return valueElement;
	}

	createPropertyValueCompoundSelectionElement(rootElement, type, key, nodeProperties, template) {
		if (!nodeProperties[key]) {
			nodeProperties[key] = {};
		}

		const typeKey = "_type";
		const value = nodeProperties[key];
		const templateValue = template[key] ?? {};
		const isAction = this.solutionSchema.isAction(type);

		let valueElement;
		if (Schema.isModel(type)) {
			valueElement = this.createModelSelectElement(nodeProperties, key);
		} else  if (Schema.isRequest(type)) {
			valueElement = this.createRequestSelectElement(nodeProperties, key);
		} else {
			const propertyTypes = this.solutionSchema.getPropertyTypes(type);
			valueElement = this.createPropertyValueSelectElement(propertyTypes, typeKey, value, templateValue, (val) => {
				if (!isAction) {
					this.updateNodeValue(value, typeKey, val);
				} else {
					this.updateNodeValue(nodeProperties, key, new Action(this.solutionId, { "_type": val }));
				}
				this.selectNode(this.modelNode);
			});
		}

		if (value instanceof Node) {
			const subElement = this.createNodeValueElement(value);
			rootElement.appendChild(subElement);
		} else if (value[typeKey]) {
			const valueType = value[typeKey];
			const typeProperties = this.solutionSchema.getPropertyProperties(valueType);

			if (!Schema.isRequest(type)) {
				const subElement = this.createPropertyValueCompoundElement(typeProperties, key, nodeProperties, template);
				rootElement.appendChild(subElement);
			} else {
				// Add values from this Request object as Template values
				const filteredTypeProperties = {};
				const reqProps = Editor.project.getRequest(valueType)?.getProperties() ?? {};
				const typeTemplate = {};
				mergeMaps(typeTemplate, template);
				if (!typeTemplate[key]) {
					typeTemplate[key] = reqProps;
				}

				for (let reqKey in reqProps) {
					let reqVal = reqProps[reqKey];
					if (typeof reqVal === "object") {
						if (reqVal[typeKey]) {
							filteredTypeProperties[reqKey] = reqVal[typeKey];
						}
					} else {
						// filteredTypeProperties[reqKey] = typeProperties[typeKey];
					}

					// if (!templateValue.hasOwnProperty(reqKey)) {
					// 	templateValue[reqKey] = reqProps[reqKey];
					// }
				}
				// template[key] = templateValue;

				const subElement = this.createPropertyValueCompoundElement(filteredTypeProperties, key, nodeProperties, typeTemplate);
				rootElement.appendChild(subElement);
			}
		}
		return valueElement;
	}

	createPropertyValueSelectElement(types, key, nodeProperties, template, onChange) {
		const valueElement = document.createElement("select");
		valueElement.className = this.id + "-item-value";

		let selectValue = document.createElement("option");
		selectValue.setAttribute("value", null);
		selectValue.innerHTML = template[key] ? template[key] + " (template)" : "";
		valueElement.appendChild(selectValue);

		for (const type of types) {
			selectValue = document.createElement("option");
			let name = typeof type === 'object' ? type.name : type;
			let value = typeof type === 'object' ? type.value : type;
			if (typeof name == "string") {
				name = name.replace("IAction", "").replace("IListAction", "").replace("IFormatter", "")
							.replace("KAction", "").replace("KListAction", "").replace("KFormatter", "");
			}

			selectValue.setAttribute("value", value);
			selectValue.innerHTML = name;
			valueElement.appendChild(selectValue);
		}

		valueElement.value = nodeProperties[key] ?? null;
		valueElement.onchange = () => {
			if (!onChange) {
				this.updateNodeValue(nodeProperties, key, valueElement.value);
			} else {
				onChange(valueElement.value);
			}
		};
		return valueElement;
	}

	createPropertyValueInputElement(type, key, nodeProperties, template) {
		let valueElement;
		let value = nodeProperties[key] ?? null;
		const templateValue = template[key] ?? null;
		if (typeof value === "string" && value.indexOf("$") >= 0) {
			type = "String";
		}

		const changeFunc = (val) => {
			this.updateNodeValue(nodeProperties, key, val);
			valueElement.value = val;
		};

		switch (type) {
			case "Bool":
			case "Boolean":
				valueElement = this.createPropertyValueSelectElement([true, false], key, nodeProperties, template);
				return this.wrapValueOptions(valueElement.value, valueElement, changeFunc);
			case "Color":
				valueElement = document.createElement("input");
				// valueElement.setAttribute("type", "color");
				if (value && value.indexOf("$") < 0) {
					if (value && !value.startsWith("#")) {
						value = "#" + value;
					}
					if (value && value.startsWith("#") && (value.length == 4 || value.length == 7 || value.length == 9)) {
						valueElement.style.backgroundColor = value;
						valueElement.style.color = invertColor(value, true);
					}
				}
				break;
			case "Int":
			case "Double":
				valueElement = document.createElement("input");
				valueElement.setAttribute("type", "decimal");
				break;
			//case "Json":
			//	return this.createPropertyValueJsonElement(nodeProperties, key);
			case "KTemplate":
				return this.createTemplateSelectElement();
			case "KComponent":
				return this.createComponentSelectElement(nodeProperties, key);
			case "IModel":
			case "KModel":
				return this.createModelSelectElement(nodeProperties, key);
			case "IRequest":
			case "KRequest":
				return this.createRequestSelectElement(nodeProperties, key);
			case "Screen":
				let isRoute = value;
				const screens = [];
				for (const screen of Editor.project.getScreens(this.solutionId)) {
					screens.push({ name: screen.getName(), value: screen.getId() });
					if (value === screen.getId()) {
						isRoute = false;
					}
				}
				if (!isRoute) {
					valueElement = this.createPropertyValueSelectElement(screens, key, nodeProperties, template, (val) => {
						this.updateNodeValue(nodeProperties, key, val);
					});
					valueElement = this.wrapValueOptions(value, valueElement, changeFunc);
					return this.wrapGotoNode(valueElement, "screen");
				}
			default:
				valueElement = document.createElement("input");
				break;
		}

		valueElement.value = value ?? null;
		valueElement.className = this.id + "-item-value";
		valueElement.onchange = () => changeFunc(valueElement.value);
		valueElement.setAttribute("placeholder", templateValue ?? "");
		return this.wrapValueOptions(valueElement.value, valueElement, changeFunc);
	}

	createPropertyValueJsonElement(rootElement, nodeProperties, key) {
		const value = nodeProperties[key];
		const editor = document.createElement("textarea");
		editor.className = this.id + "-item-value";
		editor.value = value != null ? stringify(value) : "";
		editor.onchange = () => {
			try {
				const obj = JSON.parse(editor.value);
				this.updateNodeValue(nodeProperties, key, obj);
			} catch (ex) {
				alert(ex);
			}
		};

		const editorHolder = document.createElement("div");
		editorHolder.className = this.id + "-item";
		editorHolder.appendChild(editor);
		rootElement.appendChild(editorHolder);

		return document.createElement("div");
	}

	createTemplateSelectElement() {
		const valueElement = document.createElement("select");
		valueElement.className = this.id + "-item-value";

		let selectValue = document.createElement("option");
		selectValue.setAttribute("value", null);
		valueElement.appendChild(selectValue);

		const widgetTypes = this.solutionSchema.getWidgetInheritance(this.modelNode.getType());
		for (let type of widgetTypes) {
			let templateList = Editor.project.findTemplates(this.solutionId, type);
			for (let val of templateList) {
				selectValue = document.createElement("option");
				selectValue.setAttribute("value", val.getId());
				selectValue.innerHTML = val.getName();
				valueElement.appendChild(selectValue);
			}
		}

		valueElement.value = this.modelNode.getTemplate()?.getId() ?? null;
		valueElement.onchange = () => {
			this.modelNode.setTemplate(valueElement.value);
			Editor.onNodeUpdated(this.id, this.modelNode);
			this.logInfo(`template updated to ${valueElement.value}.`);
		};

		return this.wrapGotoNode(valueElement, "template");
	}

	createComponentSelectElement(node, key) {
		const valueElement = document.createElement("select");
		valueElement.className = this.id + "-item-value";

		for (let component of Editor.project.getComponents(this.solutionId)) {
			let selectValue = document.createElement("option");
			selectValue.setAttribute("value", component.getId());
			selectValue.innerHTML = component.getName();
			valueElement.appendChild(selectValue);
		}

		valueElement.value = node[key];
		valueElement.onchange = () => this.updateNodeValue(node, key, valueElement.value);

		return this.wrapGotoNode(valueElement, "component");
	}

	wrapGotoNode(valueElement, nodeType) {
		let value = valueElement.value;
		if (value === "null" || value === "undefined") {
			value = null;
		}
		if (!value) {
			return valueElement;
		}

		const gotoButton = document.createElement("span");
		gotoButton.className = "property-panel-option-button material-symbols-outlined";
		gotoButton.innerHTML = "forward";
		gotoButton.onclick = () => {
			let node;
			if (valueElement.value) {
				switch (nodeType) {
					case "template":
						node = Editor.project.getTemplate(valueElement.value);
						break;
					case "component":
						node = Editor.project.getComponent(valueElement.value);
						break;
					case "screen":
						node = Editor.project.getScreen(valueElement.value);
						break;
					case "controller":
						node = Editor.project.getController(valueElement.value);
						break;
					case "graph":
						node = Editor.project.getGraph(valueElement.value);
						break;
					default:
						return;
				}
				if (node) {
					Editor.selectNode(node);
				}
			}
		};

		const valueHolder = document.createElement("row");
		valueHolder.classList.add(this.id + "-item-value");
		valueHolder.appendChild(valueElement);
		valueHolder.appendChild(gotoButton);
		return valueHolder;
	}

	wrapValueOptions(value, child, changeFunc) {
		const options = [
			{ name: "none", showName: false },
			{ name: "state", template: "${state.{0}}", title: "A Screen has a 'state' Map. You can use a key of that map as the value for this property.", },
			{ name: "entry", template: "${entry.{0}}", title: "An 'entry' Map is available for Widgets that are children of a ListWidget. An 'entry' is a member of the array provided to the ListWidget.", },
			{ name: "env", template: "${env.{0}}", title: "Use an environment variable as a value for this property.", },
			{ name: "global", template: "${global.{0}}", title: "The App has a global Map. You can use a key of that map as the value for this property.", },
		];

		if (child.nodeName?.toLowerCase() === "select") {
			options.push({ name: "string", template: "{0}", title: "Free text.", showName: false });
		}

		let currentOption = options[0];
		const optionLabel = document.createElement("span");
		optionLabel.classList.add("highlightedColor");

		const optionInput = document.createElement("input");
		optionInput.className = this.id + "-item-value";
		optionInput.onchange = () => changeFunc(currentOption.template.replace("{0}", optionInput.value));

		const selectFunc = (option) => {
			currentOption = option;
			optionLabel.innerHTML = option.showName === false ? "" : option.name;

			const childClass = currentOption.name === "none" ? "show" : "hide";
			const optionClass = currentOption.name === "none" ? "hide" : "show";
			child.classList.remove(optionClass);
			optionLabel.classList.remove(childClass);
			optionInput.classList.remove(childClass);
			child.classList.add(childClass);
			optionLabel.classList.add(optionClass);
			optionInput.classList.add(optionClass);

			optionInput.setAttribute("list", `${option.name}-datalist`);
		};

		const selectButton = document.createElement("label");
		selectButton.className = "property-panel-option-button material-symbols-outlined";
		selectButton.innerHTML = "more_vert";
		selectButton.title = "Value options";
		selectButton.onclick = () => showModalList(null, options, (op) => {
			optionInput.value = "";
			selectFunc(op);
		});

		const valueHolder = document.createElement("row");
		valueHolder.classList.add(this.id + "-item-value");
		valueHolder.appendChild(child);
		valueHolder.appendChild(optionLabel);
		valueHolder.appendChild(optionInput);
		valueHolder.appendChild(selectButton);

		if (value && value.split("$").length === 2) {
			for (let option of options) {
				if (!option.template) {
					continue;
				}

				let leading = option.template.split(".")[0];
				if (value.indexOf(leading + ".") === 0 && value.endsWith("}")) {
					currentOption = option;
					optionInput.value = value.replace(leading + ".", "").replace("}", "");
					break;
				}
			}
		}
		selectFunc(currentOption);

		return valueHolder;
	}

	createModelSelectElement(node, key) {
		const valueElement = document.createElement("select");
		valueElement.className = this.id + "-item-value";

		for (let entry of Editor.project.getModels(this.solutionId)) {
			let selectValue = document.createElement("option");
			selectValue.setAttribute("value", entry.getId());
			selectValue.innerHTML = entry.getName();
			valueElement.appendChild(selectValue);
		}

		valueElement.value = node[key]?._type;
		valueElement.onchange = () => {
			this.updateNodeValue(node, key, { "_type": valueElement.value });
			this.selectNode(this.modelNode);
		};
		return valueElement;
	}

	createRequestSelectElement(node, key) {
		const valueElement = document.createElement("select");
		valueElement.className = this.id + "-item-value";

		for (let entry of Editor.project.getRequests(this.solutionId)) {
			let selectValue = document.createElement("option");
			selectValue.setAttribute("value", entry.getId());
			selectValue.innerHTML = entry.getName();
			valueElement.appendChild(selectValue);
		}

		valueElement.value = node[key]?._type;
		valueElement.onchange = () => {
			this.updateNodeValue(node, key, { "_type": valueElement.value });
			this.selectNode(this.modelNode);
		};
		return valueElement;
	}

	updateNodeValue(nodeProperties, key, value) {
		if (value === "null" || value === "undefined") {
			value = null;
		}
		this.logInfo(`${key} updated: ${nodeProperties[key]} -> ${value}.`);
		nodeProperties[key] = value;
		Editor.onNodeUpdated(this.id, this.modelNode);
	}

	shouldShowProperty(type) {
		return !this.solutionSchema.isWidget(type) && !this.solutionSchema.isAction(type);
	}

	logInfo(message) {
		Editor.logInfo(`[PropertyPanel] '${this.modelNode.getName() || this.modelNode.getType()}' ${message}`, this.modelNode);
	}
}



class ActionPanel extends PropertyPanel{
	constructor() {
		super();
		this.id = "action-panel";
	}

	selectNode(node) {
		this.modelNode = node;
		this.solutionId = node.getSolutionId();

		const schemaActions = node.getActionSchema() ?? {};
		const nodeActions = node.getActions();
		const template = {}; // (node instanceof Widget ? node.getTemplate() : {}) ?? {};

		const rootPanel = document.getElementById(this.id);
		rootPanel.innerHTML = "";
		this.buildHeader(rootPanel, node);

		for (let key in schemaActions) {
			this.createPropertyElement(rootPanel, key, schemaActions[key], nodeActions, template);
		}
	}

	shouldShowProperty(type) {
		return !this.solutionSchema.isWidget(type);
	}
}
