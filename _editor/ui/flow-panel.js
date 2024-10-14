class FlowPanel extends EditorPanel {
    constructor() {
        super();
        this.id = "flow-panel";
        this.rootNode = null;
        this.solutionId = null;
        this.widgetToElement = {};
        this.actionToElement = {};
        this.actionToSvgPath = {};
        this.gridSize = 200;
        this.router;
    }

    populate() {
        this.clearGrid();
        this.rootNode = null;
        this.solutionId = null;
        this.solutionSchema = null;
        document.getElementById(this.id).onVisible = () => this.rebuild();
    }

    selectNode(node) {
        this.updateSelectedNode(node);
        if (node instanceof Endpoint) {
            this.clearGrid();
            this.rootNode = node;
            this.solutionId = node.getSolutionId();
            this.solutionSchema = Editor.project.getSchema(this.solutionId);
            this.buildEndpoint(this.rootNode);
        } else if (node instanceof Screen) {
            this.clearGrid();
            this.rootNode = node;
            this.solutionId = node.getSolutionId();
            this.solutionSchema = Editor.project.getSchema(this.solutionId);
            this.buildScreen(this.rootNode);
        } else if (node instanceof Component) {
            this.clearGrid();
            this.rootNode = node;
            this.solutionId = node.getSolutionId();
            this.solutionSchema = Editor.project.getSchema(this.solutionId);
            this.buildComponent(this.rootNode);
        } else if (node instanceof Widget) {
            const element = this.widgetToElement[node.getId()];
            if (element) {
                element.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
                // element.scrollIntoViewIfNeeded();
            }
        }
    }

    rebuild() {
        const rootElement = document.getElementById(this.id);
        const scrollTop = rootElement.parentElement.scrollTop;
        this.clearGrid();
        if (this.rootNode instanceof Endpoint) {
            this.buildEndpoint(this.rootNode);
        } else if (this.rootNode instanceof Screen) {
            this.buildScreen(this.rootNode);
        } else if (this.rootNode instanceof Component) {
            this.buildComponent(this.rootNode);
        }
        this.selectNode(Editor.selectedNode);
        rootElement.parentElement.scrollTop = scrollTop;
    }

    onNodeUpdated(origin, node, rootNode) {
        this.rebuild();
    }

    onNodeDeleted(origin, node, rootNode) {
        this.onNodeUpdated(origin, node, rootNode);
    }

    buildEndpoint(node) {
        this.buildRootActions(node);
    }

    buildScreen(screen) {
        this.buildRootActions(screen);
        this.buildWidget(screen.getBody());
    }

    buildComponent(component) {
        this.buildWidget(component);
    }

    buildWidget(widget) {
        if (!widget) {
            return;
        }
        this.buildRootActions(widget);
        const widgets = widget.getWidgets();
        for (let key of Object.keys(widgets)) {
            let value = widgets[key];
            if (value instanceof Widget) {
                this.buildWidget(value);
            } else if (Array.isArray(value)) {
                for (let child of value) {
                    this.buildWidget(child);
                }
            }
        }
    }

    buildRootActions(node) {
        const gridHolder = document.getElementById(this.id + "-grid-holder");
        const actions = node.getActionSchema();
        if (!actions || Object.keys(actions).length === 0) {
            return;
        }

        if (!(node instanceof Screen) && !(node instanceof Endpoint)) {
            const nodeInfoHolder = document.createElement("div");
            nodeInfoHolder.classList.add(this.id + "-nodeInfo");
            nodeInfoHolder.innerHTML = node.getName() ?? node.getType();
            nodeInfoHolder.onclick = () => Editor.selectNode(node);
            gridHolder.appendChild(nodeInfoHolder);
            this.widgetToElement[node.getId()] = nodeInfoHolder;
        }

        for (let key of Object.keys(actions)) {
            let actionHolder = document.createElement("div");
            actionHolder.classList.add(this.id + "-rootAction-holder");
            gridHolder.appendChild(actionHolder);

            let actionName = document.createElement("div");
            actionName.classList.add(this.id + "-rootAction-name");
            actionName.innerHTML = key;
            actionHolder.appendChild(actionName);

            let action = node.actions[key];
            if (action instanceof Action) {
                let actionGrid = document.createElement("div");
                actionGrid.classList.add(this.id + "-action-grid");
                let actionGridHolder = document.createElement("div");
                actionGridHolder.classList.add(this.id + "-action-gridHolder");
                actionGridHolder.appendChild(actionGrid);
                actionHolder.appendChild(actionGridHolder);

                this.buildAction(new Grid(actionGrid), action, node);
            } else {
                let addAction = document.createElement("div");
                addAction.classList.add(this.id + "-rootAction-add");
                addAction.classList.add("material-symbols-outlined");
                addAction.innerHTML = "add_circle";
                addAction.onclick = () => {
                    this.selectActionType(node, key);
                };
                actionName.appendChild(addAction);
            }
        }
    }

    buildAction(grid, action, parentNode) {
        const actionHolder = document.createElement("div");
        actionHolder.classList.add(this.id + "-action-holder");
        actionHolder.onclick = () => Editor.selectNode(action);
        this.appendToGrid(grid, actionHolder, action, parentNode instanceof Action ? parentNode : null);
        this.actionToElement[action.getId()] = actionHolder;

        let actionType = action.getType();
        let actionName;
        if (actionType === "IActionRequest" || actionType === "KActionRequest" || actionType === "IListActionRequest" || actionType === "KListActionRequest") {
            const requestData = action.getProperty("request");
            if (requestData) {
                const request = Editor.project.getRequest(requestData["_type"]);
                actionName = request?.getName();;
            }
        }
        actionName ??= actionType.replace("IAction", "").replace("KAction", "").replace("IListAction", "").replace("KListAction", "");

        const typeName = document.createElement("div");
        typeName.classList.add(this.id + "-actionName");
        typeName.innerHTML = actionName;
        actionHolder.appendChild(typeName);

        const actionActionsHolder = document.createElement("div");
        actionActionsHolder.classList.add(this.id + "-action-actions-holder");
        actionHolder.appendChild(actionActionsHolder);

        const createActionElement = (key, nextAction) => {
            let propertyElement = document.createElement("div");
            propertyElement.classList.add(this.id + "-action-property");
            propertyElement.innerHTML = key;
            actionHolder.appendChild(propertyElement);

            this.buildAction(grid, nextAction, action);
            let svg = this.linkActions(grid, propertyElement, action, nextAction);
            propertyElement.onclick = () => window.setTimeout(() => this.selectSvg(svg));
        };

        const nextActionsKeys = [];
        const nextActions = action.getActionSchema();
        const actionsPlaceholders = Object.keys(nextActions);
        for (let key of actionsPlaceholders) {
            let nextAction = action.actions[key];
            if (nextAction instanceof Action) {
                createActionElement(key, nextAction);
            } else {
                nextActionsKeys.push(key);
            }
        }
        // For 'ActionNodeMap' cases
        for (let key of Object.keys(action.actions)) {
            if (actionsPlaceholders.indexOf(key) >= 0) {
                continue;
            }
            let nextAction = action.actions[key];
            if (nextAction instanceof Action) {
                createActionElement(key, nextAction);
            }
        }

        if (nextActionsKeys.length > 0) {
            const addActionElement = document.createElement("div");
            addActionElement.classList.add("material-symbols-outlined");
            addActionElement.classList.add(this.id + "-action-actions-item");
            addActionElement.innerHTML = "add";
            addActionElement.onclick = (e) => {
                this.addAction(action, nextActionsKeys);
                e.stopPropagation();
            };
            actionActionsHolder.appendChild(addActionElement);
        }

        const deleteActionElement = document.createElement("div");
        deleteActionElement.classList.add("material-symbols-outlined");
        deleteActionElement.classList.add(this.id + "-action-actions-item");
        deleteActionElement.innerHTML = "delete";
        deleteActionElement.onclick = (e) => {
            const node = parentNode ?? this.rootNode;
            for (let key of Object.keys(node.actions)) {
                if (node.actions[key] === action) {
                    delete node.actions[key];
                    Editor.onNodeUpdated(this.id, this.rootNode);
                    Editor.logInfo(`[FlowPanel] Action '${action.getType()}' removed from '${parentNode.getName() || parentNode.getType()}'.`, action, parentNode, this.rootNode);
                }
            }
            e.stopPropagation();
        };
        actionActionsHolder.appendChild(deleteActionElement);
    }

    appendToGrid(grid, actionHolder, action, parentNode) {
        const pos = grid.getNextPosition(action, parentNode);
        actionHolder.style.left = (pos.x * this.gridSize) + "px";
        actionHolder.style.top = (pos.y * this.gridSize) + "px";
        grid.holder.appendChild(actionHolder);

        // Update grid height
        grid.holder.style.height = (pos.y * this.gridSize + actionHolder.offsetHeight) + "px";
    }

    linkActions(grid, actionElement, fromAction, toAction) {
        const elementWidth = 106;
        const elementHeight = 106;
        const widgetHeight = actionElement.offsetHeight;
        const fromPos = grid.getNodePosition(fromAction);
        const toPos = grid.getNodePosition(toAction);

        let fromX = fromPos.x <= toPos.x ? 0 : (fromPos.x - toPos.x) * this.gridSize;
        let fromY = (fromPos.y <= toPos.y ? 0 : (fromPos.y - toPos.y) * this.gridSize) + actionElement.offsetTop;
        let toX = toPos.x <= fromPos.x ? 0 : (toPos.x - fromPos.x) * this.gridSize;
        let toY = toPos.y <= fromPos.y ? 0 : (toPos.y - fromPos.y) * this.gridSize;

        const startAttributes = {
            code: fromAction.getId(),
            left: fromX,
            right: fromX + elementWidth,
            top: fromY,
            bottom: fromY + widgetHeight,
            xIndex: fromPos.x,
            yIndex: fromPos.y
        };
        const finishAttributes = {
            code: toAction.getId(),
            left: toX,
            right: toX + elementWidth,
            top: toY,
            bottom: toY + elementHeight,
            xIndex: toPos.x,
            yIndex: toPos.y
        };
        const pathString = this.router.getRoute(startAttributes, finishAttributes);

        const width = Math.max(fromX, toX) - Math.min(fromX, toX) + elementWidth;
        const height = Math.max(fromY, toY) - Math.min(fromY, toY) + elementHeight;
        const extraMargin = 40;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add(this.id + "-action-grid-svg");
        if (fromAction.getId() === this.rootNode.getId()) {
            svg.classList.add(this.id + "-action-grid-svg-selected");
        }
        svg.setAttribute("width", (width + extraMargin) + "px");
        svg.setAttribute("height", (height + extraMargin) + "px");
        svg.style.left = (Math.min(fromPos.x, toPos.x) * this.gridSize) + "px";
        svg.style.top = (Math.min(fromPos.y, toPos.y) * this.gridSize) + "px";
        svg.style.position = "absolute";

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add(this.id + "-action-grid-line");
        path.setAttribute("d", pathString);
        // path.onclick = (e) => {
        //     this.selectSvg(svg);
        //     e.stopPropagation();
        // };
        svg.appendChild(path);

        if (!this.actionToSvgPath[fromAction.getId()]) {
            this.actionToSvgPath[fromAction.getId()] = [];
        }
        this.actionToSvgPath[fromAction.getId()].push(svg);

        grid.holder.appendChild(svg);
        return svg;
    }

    addAction(action, options) {
        if (options.length > 1) {
            showModalList(null, options, (selectedKey) => {
                this.selectActionType(action, selectedKey);
            });
        } else {
            this.selectActionType(action, options[0]);
        }
    }

    selectActionType(node, key) {
        const baseType = node.getActionSchema()[key];
        if (baseType === "ActionNodeMap") {
            this.selectActionMapName(node, key);
        } else {
            this.selectActionTypeType(node, baseType, key)
        }
    }

    selectActionMapName(node, key) {
        const nameInput = document.createElement("input");
		nameInput.setAttribute("placeholder", "Name the new Action");
        const column = document.createElement("column");
		column.style.setProperty("gap", "10px");
		column.appendChild(nameInput);

        showModalForm("New Action", column, () => {
            this.selectActionTypeType(node, "IAction", nameInput.value);
        });
    }

    selectActionTypeType(node, baseType, key) {
        const actionTypes = this.solutionSchema.getActionTypes(baseType);
        const types = [];
        for (let type of actionTypes) {
            types.push({ "type": type, "name": type.replace("IAction", "").replace("KAction", "").replace("IListAction", "").replace("KListAction", "") });
        }

        showModalList(null, types, (option) => {
            const newAction = new Action(this.rootNode.getSolutionId(), { "_type": option.type });
            node.actions[key] = newAction;
            Editor.onNodeUpdated(this.id, this.rootNode);
            Editor.logInfo(`[FlowPanel] Action '${option.type}' created and linked to '${node.getName() || node.getType()}'.`, newAction, node, this.rootNode);
        });
    }

    selectSvg(selectedSvg) {
        for (let actionId of Object.keys(this.actionToSvgPath)) {
            var list = this.actionToSvgPath[actionId];
            for (let svg of list) {
                svg.classList.remove(this.id + "-action-grid-svg-selected");
            }
        }
        if (selectedSvg) {
            selectedSvg.classList.add(this.id + "-action-grid-svg-selected");
        }
    }

    updateSelectedNode(node) {
        for (let nodeId of Object.keys(this.widgetToElement)) {
            let element = this.widgetToElement[nodeId];
            element.classList.remove(this.id + "-nodeInfo-selected");
            if (nodeId === node.getId()) {
                element.classList.add(this.id + "-nodeInfo-selected");
            }
        }

        for (let actionId of Object.keys(this.actionToElement)) {
            let element = this.actionToElement[actionId];
            element.classList.remove(this.id + "-actionHolder-selected");
            if (actionId === node.getId()) {
                element.classList.add(this.id + "-actionHolder-selected");
            }
        }

        for (let actionId of Object.keys(this.actionToSvgPath)) {
            var list = this.actionToSvgPath[actionId];
            for (let path of list) {
                path.classList.remove(this.id + "-action-grid-svg-selected");
                if (actionId === node.getId()) {
                    path.classList.add(this.id + "-action-grid-svg-selected");
                }
            }
        }
    }

    clearGrid() {
        this.router = new Routing();
        this.widgetToElement = {};
        this.actionToElement = {};
        this.actionToSvgPath = {};
        document.getElementById(this.id + "-grid-holder").innerHTML = "";
    }
}
