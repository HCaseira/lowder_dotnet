class SearchPanel extends EditorPanel {
    constructor() {
        super();
        this.id = "search-panel";
        this.matchCase = false;
        this.matchWord = false;
        this.useRegex = false;
        this.searchTimeout;
    }

    populate() {
        document.getElementById("search-panel-results").innerHTML = "";
        if (!this.searchInput) {
            this.resultsPanel = document.getElementById(this.id + "-results");
            this._buildToolbar();
        }
    }

    onMouseEnter() { }

    selectNode(node) {
        const results = this.resultsPanel.getElementsByClassName(this.id + "-result-node-selected");
        for (let e of results) {
            e.classList.remove(this.id + "-result-node-selected");
        }
        document.getElementById(this.id + "-result-node" + node.getId())?.classList.add(this.id + "-result-node-selected");
    }

    _buildToolbar() {
        this.searchInput = document.createElement("input");
        this.searchInput.setAttribute("type", "search");
        this.searchInput.setAttribute("placeholder", "Search");
        this.searchInput.oninput = () => this.doSearch();

        const icon = document.createElement("icon");
        icon.classList.add("material-symbols-outlined");
        icon.innerHTML = "search";

        const caseButton = document.createElement("icon");
        caseButton.classList.add("material-symbols-outlined");
        caseButton.classList.add(this.id + "-toolbar-button");
        caseButton.setAttribute("title", "Match Case");
        caseButton.innerHTML = "match_case";
        caseButton.onclick = () => {
            this.matchCase = !this.matchCase;
            this.matchCase
                ? caseButton.classList.add(this.id + "-toolbar-button-on")
                : caseButton.classList.remove(this.id + "-toolbar-button-on");
            this.doSearch();
        };

        const wordButton = document.createElement("icon");
        wordButton.classList.add("material-symbols-outlined");
        wordButton.classList.add(this.id + "-toolbar-button");
        wordButton.setAttribute("title", "Match Whole Word");
        wordButton.innerHTML = "match_word";
        wordButton.onclick = () => {
            this.matchWord = !this.matchWord;
            this.matchWord
                ? wordButton.classList.add(this.id + "-toolbar-button-on")
                : wordButton.classList.remove(this.id + "-toolbar-button-on");
            this.doSearch();
        };

        const regexButton = document.createElement("icon");
        regexButton.classList.add("material-symbols-outlined");
        regexButton.classList.add(this.id + "-toolbar-button");
        regexButton.setAttribute("title", "Use Regular Expression");
        regexButton.innerHTML = "regular_expression";
        regexButton.onclick = () => {
            this.useRegex = !this.useRegex;
            this.useRegex
                ? regexButton.classList.add(this.id + "-toolbar-button-on")
                : regexButton.classList.remove(this.id + "-toolbar-button-on");
            this.doSearch();
        };

        const clearButton = document.createElement("icon");
        clearButton.classList.add("material-symbols-outlined");
        clearButton.classList.add(this.id + "-toolbar-button");
        clearButton.setAttribute("title", "Clear");
        clearButton.innerHTML = "delete";
        clearButton.onclick = () => {
            this.searchInput.value = "";
            this.resultsPanel.innerHTML = "";
        };

        const row = document.createElement("row");
        row.classList.add(this.id + "-toolbar-search");
        row.appendChild(icon);
        row.appendChild(this.searchInput);
        row.appendChild(caseButton);
        row.appendChild(wordButton);
        row.appendChild(regexButton);
        row.appendChild(clearButton);
        document.getElementById(this.id + "-toolbar").appendChild(row);
    }

    doSearch(text) {
        window.clearTimeout(this.searchTimeout);
        document.getElementById(this.id + "-tab").click();
        window.setTimeout(() => this.searchInput.focus());
        if (text) {
            this.searchInput.value = text;
        }
        if (this.searchInput.value) {
            if (this.resultsPanel.getElementsByClassName("loader").length === 0) {
                this.resultsPanel.innerHTML = "";
                const spinner = document.createElement("div");
                spinner.className = "loader";
                this.resultsPanel.appendChild(spinner);
            }

            this.searchTimeout = window.setTimeout(() => {
                const results = Editor.project.findReferences(this.searchInput.value, this.matchCase, this.matchWord, this.useRegex);
                this.renderResults(results);
            }, 500);
        }
    }

    renderResults(results) {
        this.resultsPanel.innerHTML = "";
        for (let reference of results) {
            let rootNode = reference.node;
            let references = reference.references;
            this.handleNodeReferences(rootNode, references, rootNode);
        }
    }

    handleNodeReferences(node, references, rootNode) {
        if (!references) {
            return;
        }
        if (Array.isArray(references)) {
            for (let entry of references) {
                this.handleReference(node, entry, rootNode);
            }
        } else if (typeof references === "object") {
            this.handleReference(node, references, rootNode);
        }
    }

    handleReference(node, ref, rootNode) {
        if (!ref) {
            return;
        }
        if (ref instanceof NodeReference) {
            this.handleNodeReferences(ref.node, ref.references, rootNode);
        } else if (Array.isArray(ref)) {
            for (let entry of ref) {
                this.handleReference(node, entry, rootNode);
            }
        } else if (typeof ref === "object") {
            for (let key in ref) {
                let val = ref[key];
                if (val === null || val === undefined) {
                    continue;
                }

                if (val instanceof NodeReference) {
                    this.handleNodeReferences(val.node, val.references, rootNode);
                } else if (typeof val === "object") {
                    this.handleReference(node, val, rootNode);
                } else {
                    this.renderReference(node, key, val, rootNode);
                }
            }
        }
    }

    renderReference(node, key, value, rootNode) {
        const keyInfo = document.createElement("span");
        keyInfo.innerText = key;
        const valueInfo = document.createElement("span");
        valueInfo.innerText = value;
        const propertyInfo = document.createElement("row");
        propertyInfo.classList.add(this.id + "-result-property");
        propertyInfo.appendChild(keyInfo);
        propertyInfo.appendChild(valueInfo);

        let propertyHolder = document.getElementById(`${node.getId()}-references`);
        if (propertyHolder) {
            propertyHolder.appendChild(propertyInfo);
            return;
        }

        const row = document.createElement("row");
        row.classList.add(this.id + "-result");

        const nodeInfo = this.buildNodeInfo(node, rootNode);
        row.appendChild(nodeInfo);

        propertyHolder = document.createElement("column");
        propertyHolder.setAttribute("id", `${node.getId()}-references`);
        propertyHolder.classList.add(this.id + "-result-properties");
        propertyHolder.appendChild(propertyInfo);
        row.appendChild(propertyHolder);

        if (node !== rootNode) {
            const rootNodeInfo = this.buildRootNodeInfo(rootNode);
            row.appendChild(rootNodeInfo);
        }
        this.resultsPanel.appendChild(row);
    }

    buildNodeInfo(node, rootNode) {
        const nodeName = document.createElement("span");
        nodeName.classList.add(this.id + "-result-node-name");
        nodeName.innerText = node.getName();
        const nodeType = document.createElement("span");
        nodeType.innerText = node.getFriendlyType().replace("IAction", "").replace("KAction", "").replace("IListAction", "").replace("KListAction", "");
        const nodeId = document.createElement("span");
        nodeId.innerText = node.getId();
        const rootTypeInfo = document.createElement("span");
        rootTypeInfo.innerText = node.rootType;

        const row = document.createElement("row");
        row.appendChild(nodeType);
        row.appendChild(rootTypeInfo);

        const nodeInfo = document.createElement("column");
        nodeInfo.classList.add(this.id + "-result-node-info");
        nodeInfo.appendChild(nodeName);
        nodeInfo.appendChild(row);
        nodeInfo.appendChild(nodeId);
        
        const icon = document.createElement("icon");
        icon.classList.add("material-symbols-outlined");
        icon.innerText = this.getIconForNode(node);

        const navigateIcon = document.createElement("icon");
        navigateIcon.classList.add("material-symbols-outlined");
        navigateIcon.innerText = "navigate_next";

        const line = document.createElement("row");
        line.setAttribute("id", this.id + "-result-node" + node.getId());
        line.classList.add(this.id + "-result-node");
        line.appendChild(icon);
        line.appendChild(nodeInfo);
        line.appendChild(navigateIcon);
        line.onclick = () => {
            if (rootNode !== node) {
                Editor.selectNode(rootNode);
            }
            Editor.selectNode(node);
        };
        return line;
    }

    buildRootNodeInfo(node) {
        const nodeName = document.createElement("span");
        nodeName.innerText = node.getName();
        const nodeType = document.createElement("span");
        nodeType.innerText = node.getFriendlyType();
        const nodeId = document.createElement("span");
        nodeId.innerText = node.getId();

        const row = document.createElement("row");
        row.appendChild(nodeName);
        row.appendChild(nodeType);

        const nodeInfo = document.createElement("column");
        nodeInfo.classList.add(this.id + "-result-node-info");
        nodeInfo.appendChild(row);
        nodeInfo.appendChild(nodeId);

        const icon = document.createElement("icon");
        icon.classList.add("material-symbols-outlined");
        icon.innerText = this.getIconForNode(node);

        const navigateIcon = document.createElement("icon");
        navigateIcon.classList.add("material-symbols-outlined");
        navigateIcon.innerText = "navigate_next";

        const line = document.createElement("row");
        line.setAttribute("id", this.id + "-result-node" + node.getId());
        line.classList.add(this.id + "-result-node");
        line.appendChild(icon);
        line.appendChild(nodeInfo);
        line.appendChild(navigateIcon);
        line.onclick = () => {
            Editor.selectNode(node);
        };
        return line;
    }

    getIconForNode(node) {
        let type;
        if (node instanceof WidgetDerivative || node instanceof TypeNode) {
            type = node.getFriendlyType().toLowerCase();
        } else if (node.rootType.toLowerCase() === "widget") {
            return getIconForWidget(node.getType());
        } else {
            type = node.rootType.toLowerCase();
        }

        switch (type) {
            case "screen":
                return "phone_iphone";
            case "action":
                return "account_tree";
            case "template":
                return "style";
            case "component":
                return "layers";
            case "model":
                return "assignment";
            case "request":
                return "cloud";
            case "folder":
                return "folder_open";
            default:
                return "question_mark";
        }
    }
}


class FooterPanel extends EditorPanel {
    static id = "footer-panel";

    constructor() {
        super();
        this.consolePanel = new ConsolePanel();
        this.searchPanel = new SearchPanel();
        this.panels = [this.consolePanel, this.searchPanel];
    }

    populate() {
        this.panels.forEach(p => p.populate());
        document.getElementById(FooterPanel.id).onmouseenter = () => this.panels.forEach(p => p.onMouseEnter());
    }
    selectNode(node) { this.panels.forEach(p => p.selectNode(node)); }
	onNodeCreated(origin, node, screen) { this.panels.forEach(p => p.onNodeCreated(origin, node, screen)); }
	onNodeUpdated(origin, node, screen) { this.panels.forEach(p => p.onNodeUpdated(origin, node, screen)); }
	onNodeDeleted(origin, node, screen) { this.panels.forEach(p => p.onNodeDeleted(origin, node, screen)); }

    static show() {
        document.getElementById(this.id).classList.add(this.id + "-expanded");
        document.getElementById(this.id).classList.remove(this.id + "-collapsed");
    }

    static hide() {
        document.getElementById(this.id).classList.remove(this.id + "-expanded");
        document.getElementById(this.id).classList.add(this.id + "-collapsed");
    }
}