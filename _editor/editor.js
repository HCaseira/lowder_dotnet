class BaseEditor {
	constructor() {
		this.schema = null;
		this._clientSchema = null;
		this.project = null;
		this.editMode = false;
		this.selectedNode;
		this.selectedRootNode;
	}

	async init() {
		this._buildToolbar();
		this._buildPanels();
		this.initKeys();
	}

	_buildToolbar() { }

	_buildPanels() {
		this.propertyPanel = new PropertyPanel();
		this.testPanel = new TestPanel();
		this.jsonPanel = new JsonPanel();
		this.footerPanel = new FooterPanel();
		this.consolePanel = this.footerPanel.consolePanel;
		this.searchPanel = this.footerPanel.searchPanel;
		this.panels = [this.propertyPanel, this.testPanel, this.jsonPanel, this.footerPanel];
	}

	populate() {
		const topSolution = this.project.getTopSolution();
		document.getElementById("toolbar-solution-name").innerHTML = topSolution.name;

		const environmentSelect = document.getElementById("environmentSelect");
		environmentSelect.innerHTML = "";
		environmentSelect.onchange = () => this._onEnvironmentChnaged(environmentSelect.value);
		for (let environment of topSolution.environmentData.environments) {
			const option = document.createElement("option");
			option.value = environment;
			option.innerHTML = environment;
			environmentSelect.appendChild(option);
		}

		this.selectedNode = null;
		this.selectedRootNode = null;

		for (let panel of this.panels) {
			panel.populate();
		}
		this.updateEnvironmentDatalist();
	}

	showSettings() {
		const projectData = [];
		for (let solution of this.project.solutions) {
			projectData.push({
				id: solution.id,
				name: solution.name,
				filePath: solution.filePath,
				model: solution,
				schemaStats: this.project.getSchemaStats(solution.id),
			});
		}
		const form = this._buildSettingsForm(projectData);
		showModalForm("Settings and statistics", form);
	}

	_buildSettingsForm(projectData) {
		let spacer;
		const rootElement = document.createElement("div");
		for (let solution of projectData) {
			if (solution.name === "Lowder") {
				continue;
			}

			if (spacer) {
				rootElement.appendChild(spacer);
			}

			this._buildSolutionSettingsForm(rootElement, solution);
			
			spacer = document.createElement("div");
			spacer.style.height = "20px";
		}

		return rootElement;
	}

	_buildSolutionSettingsForm(rootElement, solution) {
		const model = solution.model;
		const schemaStats = solution.schemaStats;

		const nameElement = document.createElement("label");
		nameElement.innerHTML = solution.name;
		rootElement.appendChild(nameElement);

		const spacer = document.createElement("div");
		spacer.style.height = "5px";
		rootElement.appendChild(spacer);

		const table = document.createElement("table");
		rootElement.appendChild(table);

		if (model) {
			let label = document.createElement("td");
			label.classList.add("modal-form-content-label");
			label.innerHTML = "Model: ";
			let counter = document.createElement("td");
			counter.classList.add("modal-form-content-label");
			counter.innerHTML = `${model.screens?.length ?? 0} Screens, ${model.components?.length ?? 0} Components, ${model.templates?.length ?? 0} Templates`;
			let row = document.createElement("tr");
			row.appendChild(label);
			row.appendChild(counter);
			table.appendChild(row);
		}

		if (schemaStats) {
			let label = document.createElement("td");
			label.classList.add("modal-form-content-label");
			label.innerHTML = "Schema: ";
			let counter = document.createElement("td");
			counter.classList.add("modal-form-content-label");
			counter.innerHTML = `${schemaStats.widgets} Widgets, ${schemaStats.actions} Actions, ${schemaStats.properties} Properties`;
			let row = document.createElement("tr");
			row.appendChild(label);
			row.appendChild(counter);
			table.appendChild(row);
		}
		return table;
	}

	_onEnvironmentChnaged(env) { }

	editEnvironmentVariables() {
		if (!this.project) {
			return;
		}

		let spacer;
		const tableHolder = document.createElement("column");
		for (let solution of this.project.solutions) {
			let environmentVariables = solution.environmentData;

			if (spacer) {
				tableHolder.appendChild(spacer);
			}

			let nameElement = document.createElement("label");
			nameElement.innerHTML = solution.name;
			tableHolder.appendChild(nameElement);

			let table = buildTable(environmentVariables.environments, environmentVariables.keys, environmentVariables.values);
			tableHolder.appendChild(table);

			spacer = document.createElement("div");
			spacer.style.height = "40px";
		}
		showModalForm("Environment Variables", tableHolder, () => {
			this.sendSolutionToClient();
			this.updateEnvironmentDatalist();
		}, false);
	}

	updateEnvironmentDatalist() {
		const datalist = document.getElementById("env-datalist");
		datalist.innerHTML = "";
		for (let solution of this.project.solutions) {
			let environmentVariables = solution.environmentData;
			for (let key of environmentVariables.keys) {
				let option = document.createElement("option");
				option.value = key;
				datalist.appendChild(option);
			}
		}
	}

	updateGlobalKeysDatalist(keys) {
		const datalist = document.getElementById("global-datalist");
		datalist.innerHTML = "";
		for (let key of keys) {
			let option = document.createElement("option");
			option.value = key;
			datalist.appendChild(option);
		}
	}

	editStringResources() {
		if (!this.project) {
			return;
		}

		let spacer;
		const tableHolder = document.createElement("column");
		for (let solution of this.project.solutions) {
			let stringResources = solution.stringResources;

			if (spacer) {
				tableHolder.appendChild(spacer);
			}

			let nameElement = document.createElement("label");
			nameElement.innerHTML = solution.name;
			tableHolder.appendChild(nameElement);

			let table = buildTable(stringResources.languages, stringResources.keys, stringResources.values);
			tableHolder.appendChild(table);

			spacer = document.createElement("div");
			spacer.style.height = "40px";
		}
		showModalForm("String Resources", tableHolder, this.sendSolutionToClient.bind(this), false);
	}

	importSwagger() {
		const form = document.createElement("table");

		let label = document.createElement("td");
		label.className = "modal-form-content-label";
		label.innerHTML = "Solution:";
		// TODO: options instead of input
		const solutionInput = document.createElement("select");
		solutionInput.className = "modal-form-content-input";
		for (let solution of this.project.solutions) {
			const option = document.createElement("option");
			option.value = solution.id;
			option.innerHTML = solution.name;
			solutionInput.appendChild(option);
		}
		let row = document.createElement("tr");
		row.appendChild(label);
		row.appendChild(solutionInput);
		form.appendChild(row);

		label = document.createElement("td");
		label.className = "modal-form-content-label";
		label.innerHTML = "Environment variable:";
		// TODO: options instead of input
		const varInput = document.createElement("input");
		varInput.placeholder = "eg: rest_api_uri";
		varInput.className = "modal-form-content-input";
		row = document.createElement("tr");
		row.appendChild(label);
		row.appendChild(varInput);
		form.appendChild(row);

		label = document.createElement("td");
		label.className = "modal-form-content-label";
		label.innerHTML = "From Url:";
		const urlInput = document.createElement("input");
		urlInput.className = "modal-form-content-input";
		urlInput.placeholder = "eg: http://some.address/swagger/v1/swagger.json";
		row = document.createElement("tr");
		row.appendChild(label);
		row.appendChild(urlInput);
		form.appendChild(row);

		label = document.createElement("td");
		label.className = "modal-form-content-label";
		label.innerHTML = "From File:";
		const fileInput = document.createElement("input");
		fileInput.className = "modal-form-content-input";
		fileInput.setAttribute("type", "file");
		fileInput.setAttribute("accept", ".json");
		fileInput.placeholder = "Pick a file";
		row = document.createElement("tr");
		row.appendChild(label);
		row.appendChild(fileInput);
		form.appendChild(row);

		showModalForm("Import from Swagger", form, async () => {
			if (!solutionInput.value || !varInput.value || (!urlInput.value && !fileInput.files.length > 0)) {
				showModalError("Error", "You're missing some inputs.");
				return false;
			} else {
				if (fileInput.files.length > 0) {
					const file = fileInput.files[0];
					try {
						this.internalImportSwagger(solutionInput.value, varInput.value, JSON.parse(await file.text()));
					} catch (e) {
						showModalError("Error importing Swagger from file.", e);
						return false;
					}
				} else {
					let response;
					try {
						response = await fetch(urlInput.value, { method: "GET" });
					} catch (e) {
						showModalError("Error importing Swagger from url", e);
						return false;
					}
					
					if (response.status === 200) {
						this.internalImportSwagger(solutionInput.value, varInput.value, await response.json());
						return true;
					} else {
						showModalError("Error importing Swagger from url", response.statusText);
						return false;
					}
				}
			}
		});
	}

	internalImportSwagger(solutionId, uriVar, data) {
		const paths = data.paths;
		const models = data.components?.schemas;
		const solution = this.project.getSolution(solutionId);
		const existingTypes = solution.types;
		const existingFolders = solution.folders;

		if (models) {
			let folder = existingFolders.find(m => m.getName() === "Models");
			if (!folder) {
				folder = solution.createFolder();
				folder.setName("Models");
			}

			for (let name in models) {
				let model = existingTypes.find(m => m.getName() === name);
				if (!model) {
					model = solution.createModel();
					model.setName(name);
					model.setFolder(folder.getId());
				}
				
				let props = models[name].properties;
				for (let key in props) {
					// TODO: convert Swagger type to Lowder type
					model.setProperty(key, props[key].type);
				}
				this.onNodeCreated("editor", model);
			}
		}

		if (paths) {
			for (let pathName in paths) {
				let verbs = paths[pathName];
				let fixedPathName = pathName.indexOf("/") === 0 ? pathName.substring(1) : pathName;

				for (let verb in verbs) {
					let requestName = verb + " " + fixedPathName;
					let request = existingTypes.find(m => m.getName() === requestName);
					
					if (!request) {
						request = solution.createRequest();
						request.setName(requestName);

						let folderName = fixedPathName;
						if (verbs[verb].tags && verbs[verb].tags.length > 0) {
							folderName = verbs[verb].tags[0];
						}
						let folder = existingFolders.find(m => m.getName() === folderName);
						if (!folder) {
							folder = solution.createFolder();
							folder.setName(folderName);
						}
						request.setFolder(folder.getId());
					}
					request.setProperty("url", "${env." + uriVar + "}");
					request.setProperty("path", pathName);
					request.setProperty("method", verb);

					let queryParams = verbs[verb].parameters;
					if (queryParams && queryParams.length > 0) {
						let pathParamsModelName = requestName + " Params";
						let queryParamsModelName = requestName + " Query";
						
						for (let parameter of queryParams) {
							switch (parameter["in"]) {
								case "path":
									let pathParamsModel = existingTypes.find(m => m.getName() === pathParamsModelName);
									if (!pathParamsModel) {
										pathParamsModel = solution.createModel();
										pathParamsModel.setName(pathParamsModelName);
										pathParamsModel.setFolder(request.getFolder());
										request.setProperty("pathParameters", { "_type": pathParamsModel.getId() });
									}
									pathParamsModel.setProperty(parameter["name"], "String");
									break;
								case "query":
									let queryParamsModel = existingTypes.find(m => m.getName() === queryParamsModelName);
									if (!queryParamsModel) {
										queryParamsModel = solution.createModel();
										queryParamsModel.setName(queryParamsModelName);
										queryParamsModel.setFolder(request.getFolder());
										request.setProperty("queryArgs", { "_type": queryParamsModel.getId() });
									}
									queryParamsModel.setProperty(parameter["name"], "String");
									break;
							}
						}
					}

					let requestBody = verbs[verb].requestBody?.content;
					if (requestBody) {
						for (let key in requestBody) {
							let schema = requestBody[key]?.schema;
							if (schema["$ref"]) {
								let parts = schema["$ref"].split("/");
								let modelName = parts[parts.length -1];
								let model = existingTypes.find(m => m.getName() === modelName);
								if (model) {
									request.setProperty("body", { "_type": model.getId() });
								}
							}
							break;
						}
					}

					this.onNodeCreated("editor", request);
				}
			}
		}
	}

	showHelp() { }

	selectNode(node) {
		this.selectedNode = node;
		if (node.isRootNode) {
			this.selectedRootNode = node;
		}
		for (let panel of this.panels) {
			panel.selectNode(node);
		}
	}

	onNodeCreated(origin, node) {
		for (let panel of this.panels) {
			panel.onNodeCreated(origin, node, this.selectedRootNode);
		}
	}

	onNodeUpdated(origin, node) {
		for (let panel of this.panels) {
			panel.onNodeUpdated(origin, node, this.selectedRootNode);
		}
	}

	onNodeDeleted(origin, node) {
		for (let panel of this.panels) {
			panel.onNodeDeleted(origin, node, this.selectedRootNode);
		}
	}

	sendSolutionToClient() {}

	initKeys() {
		window.onkeydown = (e) => {
			if (e.ctrlKey && this.project) {
				if (e.key === "f") {
					e.preventDefault();
					this.doSearch();
				} else if (e.key === "s") {
					e.preventDefault();
					this.saveSolution();
				}
			}
		};
	}

	handleClientMessage(message) {
		switch (message.dataType) {
			case "log":
				this.consolePanel.onLog(message.data);
				break;
			case "globalVars":
				this.updateGlobalKeysDatalist(message.data["keys"]);
				break;
		}
	}

	clipboardPut(obj) {
		this.storedObject = obj;
	}

	clipboardGet() {
		return this.storedObject;
	}

	logInfo(message, node, parentNode, rootNode) {
		this._log("info", message, node, parentNode, rootNode);
	}

	logWarn(message, node, parentNode, rootNode) {
		this._log("warn", message, node, parentNode, rootNode);
	}

	logError(message, node, parentNode, rootNode, error, stackTrace) {
		this._log("error", message, node, parentNode, rootNode, error, stackTrace);
	}

	_log(type, message, node, parentNode, rootNode, error, stackTrace) {
		const dt = new Date();
		const dateTime = `${dt.getFullYear()}-${`${dt.getMonth()}`.padStart(2, "0")}-${`${dt.getDay()}`.padStart(2, "0")} ${`${dt.getHours()}`.padStart(2, "0")}:${`${dt.getMinutes()}`.padStart(2, "0")}:${`${dt.getSeconds()}`.padStart(2, "0")}.${`${dt.getMilliseconds()}`.padStart(3, "0")}`;
		rootNode = rootNode || this.selectedRootNode;

		const context = {};
		if (node) {
			context["node"] = {
				id: node.getId(),
				type: node.getType(),
				name: node.getName(),
			}
		}
		if (parentNode) {
			context["parentNode"] = {
				id: parentNode.getId(),
				type: parentNode.getType(),
				name: parentNode.getName(),
			}
		}
		if (rootNode) {
			context["rootNode"] = {
				id: rootNode.getId(),
				type: rootNode.getType(),
				name: rootNode.getName(),
			}
		}

		this.consolePanel.onLog({
			type: type,
			origin: "editor",
			message: `${dateTime} ${message}`,
			context: context,
			error: error,
			stackTrace: stackTrace
		});
	}

	doSearch(text) {
		this.searchPanel.doSearch(text);
		FooterPanel.show();
	}
}
