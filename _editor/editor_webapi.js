class WebApiEditor extends BaseEditor {
	constructor() {
		super();
	}

	async init() {
		await super.init();
		this.initPoll();
		this._loadSolution();
	}

	_buildPanels() {
		super._buildPanels();
		this.controllerPanel = new ControllerPanel();
		this.graphPanel = new GraphPanel();
		this.typePanel = new TypePanel();
		this.flowPanel = new FlowPanel();
		this.panels.push(this.controllerPanel, this.graphPanel, this.typePanel, this.flowPanel);
	}

	async _loadSolution() {
		const schema = await this.callServer("GET", "schema");
		const solution = await this.callServer("GET", "model");
		schema.data = solution;

		this.project = new Project();
		this.project.build([schema]);
		this.populate();

		return true;
	}

	async saveSolution() {
		await this.callServer("POST", "model", this.project.getTopSolution());
	}

	sendSolutionToClient() {
		if (this.project) {
			this.callServer("PUT", "model", {
				model: this.project.getTopSolution(),
				environment: document.getElementById("environmentSelect").value,
				// selectedNode: this.selectedNode?.getId(),
				// state: this.selectedNode ? this.project.getTestData(this.selectedNode?.getId()) : null
			});
		}
	}

	async callServer(method, command, data) {
		let body;
		if (data) {
			body = stringify(data);
		}

		const response = await fetch(`lowder/${command}`, {
			headers: { 'Content-Type': 'application/json' },
			method: method,
			body: body
		});

		try {
			const contentLength = response.headers.get("content-length");
			if (!contentLength || parseInt(contentLength) > 0)
				return await response.json();
		} catch (e) {
			this.logError(`Error calling Lowder Server: ${e}`);
		}
		return {};
	}

	async initPoll() {
		while (true) {
			try {
				let response = await fetch("lowder/messages", {
					headers: { 'Content-Type': 'application/json' },
					method: "GET"
				});
				if (response.status === 200) {
					this.handleClientMessage(await response.json());
				}
				await sleep(100);
			}
			catch (e) {
				this.logError(`Error calling Lowder Server: ${e}`);
			}
		}
	}
}
