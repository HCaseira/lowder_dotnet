class Screen extends RootNode {
	constructor(solution, nodeData) {
		super(solution, nodeData);
		this._type = this._type ?? "Screen";
	}

	get rootType() {
		return "Widget";
	}
	
	fromObject(screenData) {
		super.fromObject(screenData);
		const solutionId = this.getSolutionId();
		const schema = Editor.project.getSchema(solutionId);
		this.widgets = {};

		if (screenData) {
			const props = screenData["properties"] || screenData;
			const propsSchema = schema.getProperties(this) ?? {};
			for (let key in propsSchema) {
				if (props.hasOwnProperty(key)) {
					this.properties[key] = props[key];
				}
			}

			const widgets = screenData["widgets"] || screenData;
			const widgetSchema = schema.getWidgets(this) ?? {};
			for (let key in widgetSchema) {
				if (widgets.hasOwnProperty(key)) {
					this.widgets[key] = new Widget(solutionId, widgets[key]);
				}
			}

			const actions = screenData["actions"] || screenData;
			const actionSchema = schema.getActions(this) ?? {};
			for (let key in actionSchema) {
				if (actions.hasOwnProperty(key)) {
					this.actions[key] = new Action(solutionId, actions[key]);
				}
			}
		}
	}

	getWidget(key) {
		return this.widgets[key];
	}

	setWidget(key, widget) {
		this.widgets[key] = widget;
	}

	getBody() {
		return this.getWidget("body");
	}

	setBody(widget) {
		this.setWidget("body", widget);
	}

	findWidget(widgetId) {
		const body = this.getBody();
		if (!body)
			return null;
		if (body.getId() === widgetId)
			return body;
		return body.findWidget(widgetId);
	}

	clone() {
		var newObj = JSON.parse(stringify(this));
		delete newObj["_id"];
		const widgets = {};
		newObj["widgets"] = widgets;
		const actions = {};
		newObj["actions"] = actions;

		let props = this.widgets;
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
	
		props = this.actions;
		for (let key in props) {
			let prop = props[key];
			if (prop instanceof Action) {
				actions[key] = prop.clone();
			}
		}
	
		return new Screen(this.getSolutionId(), newObj);
	}
}
