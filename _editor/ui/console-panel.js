class ConsolePanel extends EditorPanel {
    constructor() {
        super();
        this.id = "console-panel";
        this.followTail = true;
    }

    onMouseEnter() {
        if (!this.logPanel)
            this.buildPanel();
        this._scrollToEnd();
    }

    buildPanel() {
        this.logPanel = document.getElementById(this.id + "-logs");
        this.logPanel.innerHTML = "";
        // document.getElementById(this.id).onmouseleave = () => this._scrollToEnd();
        this._buildToolbar();
    }

    onLog(logMessage) {
        if (!this.logPanel)
            this.buildPanel();

        const type = this._getLogType(logMessage.type ?? "info");
        const origin = logMessage.origin?.toLowerCase();

        const logData = this._buildLogData(logMessage);
        logData.classList.add(this.id + "-level-" + type);
        logData.classList.add(this.id + "-origin-" + origin);

        const logRow = document.createElement("row");
        logRow.classList.add(this.id + "-logLine");
        logRow.classList.add(this.id + "-level-" + type);
        logRow.classList.add(this.id + "-origin-" + origin);
        logRow.classList.add(this.id + "-logLine-" + type);
        logRow.classList.add(this.id + "-logLine-" + origin);
        if (logData.hasChildNodes()) {
            logRow.classList.add(this.id + "-hasData");
        }

        const message = document.createElement("span");
        message.innerText = logMessage.message;
        logRow.append(message);

        // Update status control
        const statusControl = document.getElementById("footer-panel-status");
        statusControl.innerHTML = "";
        statusControl.append(logRow.cloneNode(true));

        logRow.onclick = () => {
            const selectedRows = this.logPanel.getElementsByClassName(this.id + "-logLine-selected");
            for (let row of selectedRows) {
                row.classList.remove(this.id + "-logLine-selected");
            }
            logRow.classList.add(this.id + "-logLine-selected");
            if (logData.hasChildNodes()) {
                logData.classList.toggle("hidden");
            }
        };

        this.logPanel.appendChild(logRow);
        this.logPanel.appendChild(logData);
        
        let children = this.logPanel.getElementsByClassName(this.id + "-logLine");
        while (children.length > 200) {
            this.logPanel.children[0].remove();
            this.logPanel.children[0].remove();
            children = this.logPanel.getElementsByClassName(this.id + "-logLine");
        }

        this._scrollToEnd();
        this._filterLogs(this.searchInput.value);
    }

    _buildLogData(logMessage) {
        const logData = document.createElement("column");
        logData.classList.add(this.id + "-logData");
        logData.classList.add("hidden");

        if (logMessage.error || logMessage.stackTrace) {
            const logErrorHolder = document.createElement("column");
            logErrorHolder.classList.add(this.id + "-logData-error");
            logData.appendChild(logErrorHolder);
            if (logMessage.error) {
                const logError = document.createElement("span");
                logError.innerHTML = logMessage.error;
                logErrorHolder.appendChild(logError);
            }
            if (logMessage.stackTrace) {
                const logStack = document.createElement("span");
                logStack.innerHTML = logMessage.stackTrace.replaceAll("\n", "<br>");
                logErrorHolder.appendChild(logStack);
            }
        }

        if (logMessage.context) {
            const keys = Object.keys(logMessage.context);
            if (keys.length > 0) {
                const logContext = document.createElement("row");
                logData.appendChild(logContext);

                for (let key of keys) {
                    let entry = this._buildLogObject(key, logMessage.context[key], true);
                    logContext.appendChild(entry);
                }
            }
        }

        return logData;
    }

    _buildLogObject(key, val, expanded) {
        let stringValue;
        const holder = document.createElement("column");
        holder.classList.add(this.id + "-logData-holder");
        
        const valueRow = document.createElement("row");
        valueRow.classList.add(this.id + "-logData-row");
        holder.appendChild(valueRow);

        const name = document.createElement("span");
        name.classList.add(this.id + "-logData-name");
        name.innerHTML = `${key}:`;
        valueRow.append(name);
        
         if (val !== null && val !== undefined && typeof val === 'object') {
            stringValue = stringify(val);

            const type = document.createElement("icon");
            type.classList.add(this.id + "-logData-type");
            type.classList.add("material-symbols-outlined");
            valueRow.appendChild(type);
            if (Array.isArray(val)) {
                type.innerHTML = "data_array";
                type.title = "List";
            } else {
                type.innerHTML = "data_object";
                type.title = "Map";
            }

            if (expanded) {
                const data = document.createElement("column");
                holder.appendChild(data);

                if (Array.isArray(val)) {
                    const arr = val.slice(0, Math.min(val.length, 10));
                    if (val.length > 10) {
                        arr.push("...");
                    }
                    for (let i = 0; i < arr.length; i++) {
                        let entryData = this._buildLogObject(i, arr[i]);
                        data.appendChild(entryData);
                    }
                } else {
                    const keys = Object.keys(val);
                    for (let key of keys) {
                        let entry = this._buildLogObject(key, val[key]);
                        data.appendChild(entry);
                    }
                }
            } else {
                const data = document.createElement("span");
                data.classList.add(this.id + "-logData-object");
                data.classList.add("hidden");
                if (stringValue) {
                    data.innerHTML = stringValue.replaceAll("\n", "<br>").replaceAll(" ", "&nbsp;");
                }
                holder.appendChild(data);

                valueRow.classList.add(this.id + "-hasData");
                valueRow.onclick = () => data.classList.toggle("hidden");
            }
        } else {
            stringValue = `${val}`;
            const dataVal = document.createElement("span");
            dataVal.classList.add(this.id + "-logData-value");
            dataVal.innerHTML = stringValue;
            valueRow.appendChild(dataVal);
        }

        const copy = document.createElement("icon");
        copy.title = "Copy to clipboard";
        copy.innerHTML = "content_copy";
        copy.classList.add(this.id + "-logData-copy");
        copy.classList.add("material-symbols-outlined");
        copy.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(stringValue);
            showToast("Copied to the clipboard");
        };
        valueRow.appendChild(copy);

        return holder;
    }

    _buildToolbar() {
        this._buildToolbarLevels();
        this._buildToolbarFilters();
        this._buildToolbarSearch();
        this._buildToolbarOrigins();
    }

    _buildToolbarLevels() {
        const buildButton = (level) => {
            const button = document.createElement("span");
            button.classList.add(this.id + "-toolbar-toggler");
            button.classList.add(this.id + "-toolbar-toggler-active");
            button.classList.add(this.id + "-toolbar-level-" + level);
            button.innerHTML = level;
            button.onclick = () => {
                button.classList.toggle(this.id + "-toolbar-toggler-active");
                this.logPanel.classList.toggle(this.id + "-hide-" + level);
            };
            return button;
        };

        const levels = ["info", "warn", "error"];
        const row = document.createElement("row");
        row.classList.add(this.id + "-toolbar-buttons");
        document.getElementById(this.id + "-toolbar").appendChild(row);
        for (let level of levels) {
            row.appendChild(buildButton(level));
        }
    }

    _buildToolbarFilters() {
        const row = document.createElement("row");
        row.classList.add(this.id + "-toolbar-filters");
        row.classList.add(this.id + "-toolbar-buttons");
        document.getElementById(this.id + "-toolbar").appendChild(row);
    }

    _buildToolbarSearch() {
        let timeoutId;
        this.searchInput = document.createElement("input");
        this.searchInput.setAttribute("type", "search");
        this.searchInput.setAttribute("placeholder", "Find logs");
        
        this.searchInput.oninput = () => {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => this._filterLogs(this.searchInput.value), 500);
        };

        const icon = document.createElement("icon");
        icon.classList.add("material-symbols-outlined");
        icon.innerHTML = "search";

        const clearButton = document.createElement("icon");
        clearButton.classList.add("material-symbols-outlined");
        clearButton.classList.add(this.id + "-toolbar-button");
        clearButton.setAttribute("title", "Clear console");
        clearButton.innerHTML = "delete";
        clearButton.onclick = () => this.logPanel.innerHTML = "";

        const row = document.createElement("row");
        row.classList.add(this.id + "-toolbar-search");
        row.appendChild(icon);
        row.appendChild(this.searchInput);
        row.appendChild(clearButton);
        
        document.getElementById(this.id + "-toolbar").appendChild(row);
    }

    _buildToolbarOrigins() {
        const buildButton = (origin) => {
            const button = document.createElement("span");
            button.classList.add(this.id + "-toolbar-toggler");
            button.classList.add(this.id + "-toolbar-toggler-active");
            button.classList.add(this.id + "-toolbar-origin-" + origin);
            button.innerHTML = origin;
            button.onclick = () => {
                button.classList.toggle(this.id + "-toolbar-toggler-active");
                this.logPanel.classList.toggle(this.id + "-hide-" + origin);
            };
            return button;
        };

        const origins = ["editor", "client", "server"];
        const row = document.createElement("row");
        row.classList.add(this.id + "-toolbar-buttons");
        document.getElementById(this.id + "-toolbar").appendChild(row);
        for (let origin of origins) {
            row.appendChild(buildButton(origin));
        }
    }

    _filterLogs(text) {
        text = text.toLowerCase();

        const filterLog = (line, data) => {
            let spans = line.getElementsByTagName("span");
            for (let span of spans) {
                if (span.innerHTML.toLowerCase().indexOf(text) >= 0) {
                    line.classList.remove(this.id + "-hidden");
                    data.classList.remove(this.id + "-hidden");
                    return;
                }
            };
            spans = data.getElementsByTagName("span");
            for (let span of spans) {
                if (span.innerHTML.toLowerCase().indexOf(text) >= 0) {
                    line.classList.remove(this.id + "-hidden");
                    data.classList.remove(this.id + "-hidden");
                    return;
                }
            };

            line.classList.add(this.id + "-hidden");
            data.classList.add(this.id + "-hidden");
        };

        const lines = this.logPanel.getElementsByClassName(this.id + "-logLine");
        const linesData = this.logPanel.getElementsByClassName(this.id + "-logData");
        for (let i = 0; i < lines.length; i++) {
            filterLog(lines[i], linesData[i]);
        }
    }

    _getLogType(value) {
        switch (value.toLowerCase()) {
            case "warn":
            case "warning":
                return "warn";
            case "error":
            case "severe":
            case "shout":
                return "error";
            default:
                return "info";
        }
    }

    _scrollToEnd() {
        if (this.followTail) {
            this.logPanel.scrollTo(0, this.logPanel.scrollHeight);
        }
    }
}