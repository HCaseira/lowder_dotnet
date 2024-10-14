var pointerX = 0;
var pointerY = 0;
document.onmousemove = function(event) {
	pointerX = event.pageX;
	pointerY = event.pageY;
}

function showModalError(title, message) {
	const messageElement = document.createElement("span");
	messageElement.className = "modal-row-label";
	messageElement.innerHTML = message;
	showModalForm(title, messageElement);
}

function showModalForm(title, form, onOk, canClose = true) {
	const closeFunction = () => document.body.removeChild(fullScreen);

	const modal = document.createElement("column");
	modal.className = "modal-form";

	const titleHolder = document.createElement("row");
	titleHolder.className = "modal-form-title";
	modal.appendChild(titleHolder);

	const titleElement = document.createElement("span");
	titleElement.innerHTML = title;
	titleHolder.appendChild(titleElement);

	const formHolder = document.createElement("div");
	formHolder.className = "modal-form-content";
	formHolder.appendChild(form);
	modal.appendChild(formHolder);

	if (onOk) {
		const buttons = document.createElement("span");
		buttons.className = "modal-form-buttons";
		modal.appendChild(buttons);

		if (canClose) {
			const cancelButton = document.createElement("span");
			cancelButton.innerHTML = "Cancel";
			cancelButton.onclick = () => document.body.removeChild(fullScreen);
			buttons.appendChild(cancelButton);
		}
		const okButton = document.createElement("span");
		okButton.innerHTML = "Ok";
		okButton.onclick = async () => {
			if (await onOk() !== false) {
				closeFunction();
			}
		};
		buttons.appendChild(okButton);
	} else if (canClose) {
		const closeButton = document.createElement("icon");
		closeButton.className = "material-symbols-outlined modal-form-close-button";
		closeButton.innerHTML = "cancel";
		closeButton.onclick = () => closeFunction();
		titleHolder.appendChild(closeButton);
	}

	if (!title && titleHolder.children.length === 1) {
		titleHolder.remove();
	}

	const fullScreen = document.createElement("div");
	fullScreen.className = "modal-background";
	fullScreen.appendChild(modal);
	document.body.appendChild(fullScreen);

	return closeFunction;
}

function showModalList(referenceElement, options, onSelect, title = null) {
	if (options.length === 1) {
		onSelect(options[0]);
		return;
	}

	const modal = document.createElement("column");
	modal.className = "modal-select";

	if (title) {
		const titleHolder = document.createElement("span");
		titleHolder.innerText = title;
		titleHolder.className = "modal-select-title";
		modal.appendChild(titleHolder);
	}

	if (options.length > 10) {
		const searchInput = document.createElement("input");
		searchInput.setAttribute("placeholder", "search");
		searchInput.onkeyup = () => searchFunc(searchInput.value);
		modal.appendChild(searchInput);
		window.setTimeout(() => searchInput.focus());
	}

	const optionsHolder = document.createElement("column");
	optionsHolder.className = "modal-select-options";
	modal.appendChild(optionsHolder);

	const searchFunc = (text) => {
		text = text.toLowerCase();
		optionsHolder.innerHTML = "";
		for (const value of options) {
			const name = typeof value === 'object' ? value.name : value;
			if (text && name.toLowerCase().indexOf(text) < 0) {
				continue;
			}

			const option = document.createElement("span");
			option.className = "modal-option";
			option.innerHTML = name;
			option.onclick = () => {
				onSelect(value);
			}
			if (value.title) {
				option.title = value.title;
			}
			optionsHolder.appendChild(option);
		}
	};
	searchFunc("");

	const fullScreen = document.createElement("div");
	fullScreen.className = "modal-background";
	fullScreen.appendChild(modal);
	fullScreen.onclick = () => document.body.removeChild(fullScreen);
	document.body.appendChild(fullScreen);

	if (!referenceElement) {
		modal.style.left = Math.min(pointerX, document.body.clientWidth - modal.clientWidth) + "px";
		modal.style.top = Math.min(pointerY, document.body.clientHeight - modal.clientHeight) + "px";
	}
}

function buildTable(columns, rows, values) {
	const table = document.createElement("table");
	table.className = "table-container";
	_buildTable(table, columns, rows, values);
	return table;
}
function _buildTable(table, columns, rows, values) {
	table.innerHTML = "";

	const buildColumn = (name) => {
		const nameElement = document.createElement("span");
		nameElement.innerHTML = name;
		const deleteButton = document.createElement("icon");
		deleteButton.className = "material-symbols-outlined";
		deleteButton.innerHTML = "delete";
		deleteButton.onclick = () => {
			const idx = columns.indexOf(name);
			columns.splice(idx, 1);
			for (let entry of values) {
				entry.splice(idx, 1);
			}
			_buildTable(table, columns, rows, values);
		};

		const column = document.createElement("th");
		column.className = "table-column-title";
		column.appendChild(nameElement);
		column.appendChild(deleteButton);
		row.appendChild(column);
	}

	let row = document.createElement("tr");
	row.appendChild(document.createElement("th"));
	for (let name of columns) {
		buildColumn(name);
	}
	
	const addButton = document.createElement("icon");
	addButton.className = "material-symbols-outlined";
	addButton.innerHTML = "add";
	addButton.onclick = () => {
		const input = document.createElement("input");
		input.setAttribute("placeholder", "Name the new column");
		showModalForm("New Column", input, () => {
			if (input.value) {
				columns.push(input.value);
				for (let entry of values) {
					entry.push("");
				}
				_buildTable(table, columns, rows, values);
			}
		});
		input.focus();
	};
	const addColumn = document.createElement("th");
	addColumn.appendChild(addButton);

	row.appendChild(addColumn);
	table.appendChild(row);

	for (let i = 0; i < rows.length; i++) {
		row = _buildTableValueRow(i, rows, values);
		table.appendChild(row);
	}

	const onNewRow = () => {
		table.removeChild(addRow);
		row = _buildTableValueRow(rows.length - 1, rows, values);
		table.appendChild(row);
		table.appendChild(addRow);
	};
	const addRow = _buildTableAddRow(rows, values, columns.length, onNewRow);
	table.appendChild(addRow);
}
function _buildTableValueRow(idx, keysArray, valuesArray) {
	const rowValue = keysArray[idx];
	const valueList = valuesArray[idx];
	const dataRow = document.createElement("tr");

	const rowTitle = document.createElement("td");
	rowTitle.className = "table-row-title";
	rowTitle.innerHTML = rowValue;
	dataRow.appendChild(rowTitle);

	for (let j = 0; j < valueList.length; j++) {
		let holder = document.createElement("td");
		holder.className = "table-value";
		dataRow.appendChild(holder);

		let item = document.createElement("input");
		item.value = valueList[j];
		item.onchange = () => valueList[j] = item.value;
		holder.appendChild(item);
	}

	const deleteButton = document.createElement("icon");
	deleteButton.className = "material-symbols-outlined";
	deleteButton.innerHTML = "delete";
	deleteButton.onclick = () => {
		keysArray.splice(keysArray.indexOf(rowValue), 1);
		valuesArray.splice(valuesArray.indexOf(valueList), 1);
		dataRow.parentElement.removeChild(dataRow);
	};
	const deleteRow = document.createElement("td");
	deleteRow.className = "table-row-delete";
	deleteRow.appendChild(deleteButton);
	dataRow.appendChild(deleteRow);

	return dataRow;
}
function _buildTableAddRow(keysArray, valuesArray, numCols, onAdded) {
	const addNew = document.createElement("input");
	addNew.setAttribute("placeholder", "Add new");
	addNew.onchange = () => {
		if (addNew.value) {
			keysArray.push(addNew.value);
			var newValues = [];
			for (let i = 0; i < numCols; i++) newValues.push("");
			valuesArray.push(newValues);
			onAdded();
			addNew.value = "";
		}
	};
	window.setTimeout(() => addNew.focus());

	const addNewHolder = document.createElement("td");
	addNewHolder.className = "table-value";
	addNewHolder.appendChild(addNew);

	const row = document.createElement("tr");
	row.appendChild(addNewHolder);
	return row;
}

function show(elementId) {
	const element = document.getElementById(elementId);
	if (!element.classList.contains("show")) {
		element.classList.remove("hide");
		element.classList.add("show");
	}
}

function selectCollapsibleTab(evt, idx, expand) {
	let target = evt.target;
	while (target && !target.classList.contains("collapsible-tabs")) {
		target = target.parentElement;
	}
	if (!target) {
		return;
	}

	const panels = target.getElementsByClassName("collapsible-tabs-panels")[0];
	for (let panel of panels.children) {
		panel.classList.add("hidden");
	}
	panels.children[idx].classList.remove("hidden");

	const buttons = target.getElementsByClassName("collapsible-tabs-buttons")[0];
	for (let button of buttons.children) {
		button.classList.remove("collapsible-tabs-button-selected");
	}
	buttons.children[idx].classList.add("collapsible-tabs-button-selected");

	if (expand) {
		toggleCollapsibleTabs(evt, expand);
	}
}
function toggleCollapsibleTabs(evt, expand) {
	let target = evt.target;
	while (target && !target.classList.contains("collapsible-tabs")) {
		target = target.parentElement;
	}

	if (target) {
		if (expand || target.classList.contains("collapsible-tabs-collapsed")) {
			target.classList.remove("collapsible-tabs-collapsed");
		} else {
			target.classList.add("collapsible-tabs-collapsed");
		}
	}
}

function tabClick(tabHolderId, panelHolderId, idx) {
	const tabHolder = document.getElementById(tabHolderId);
	for (let child of tabHolder.children)
		child.classList.remove("tab-item-selected");
	tabHolder.children[idx].classList.add("tab-item-selected");

	const panelHolder = document.getElementById(panelHolderId);
	for (let i = 0; i < panelHolder.children.length; i++) {
		let child = element = panelHolder.children[i];
		if (i === idx) {
			child.classList.remove("tab-panel-invisible");
			if (child.onVisible) {
				child.onVisible();
			}
		} else {
			child.classList.add("tab-panel-invisible");
			if (child.onInvisible) {
				child.onInvisible();
			}
		}
	}
}

function showToast(message) {
	if (window.snackbarTimeout) {
		window.clearTimeout(window.snackbarTimeout);
	}

	const span = document.createElement("span");
	span.innerText = message;

	const snackbar = document.getElementById("snackbar");
	while (snackbar.children.length > 5) {
		snackbar.children[0].remove();
	}
	snackbar.appendChild(span);
	snackbar.classList.remove("snackbar-hide");
	snackbar.classList.add("snackbar-show");

	window.snackbarTimeout = setTimeout(() => {
		snackbar.classList.add("snackbar-hide");
		snackbar.classList.remove("snackbar-show");
		window.snackbarTimeout = window.setTimeout(() => {
			snackbar.innerHTML = "";
			snackbar.classList.remove("snackbar-hide");
		}, 500);
	}, 2000);
}

function childOf(/*child node*/c, /*parent node*/p) {
	if (!c || !p) return false;
	if (c === p) return true;
	while((c=c.parentNode)&&c!==p); 
	return !!c; 
}

function stringify(obj) {
	const replacer = (k, v) => {
		if (v === null || v === undefined || v === "null" || v === "undefined" || k === "_children" || k === "_solution") {
			return undefined;
		}
		if (typeof v === "string") {
			if (v.length == 0) {
				return undefined;
			}
		} else if (Array.isArray(v)) {
			if (v.length === 0) {
				return undefined;
			}
		} else if (v.constructor === Object) {
			if (Object.keys(v).length === 0) {
				return undefined;
			}
		}
		return v;
	};

	let jsonString = JSON.stringify(obj, replacer, "  ");
	while (jsonString !== undefined && jsonString.includes("{}")) {
		jsonString = JSON.stringify(JSON.parse(jsonString), replacer, "  ");
	}
	return jsonString;
}

function getIconForWidget(type) {
	switch (type?.toLowerCase()) {
		case "screen":
			return "phone_iphone";
		case "text":
		case "textfield":
		case "textformfield":
		case "richtext":
		case "textspan":
			return "text_fields";
		case "listtile":
			return "short_text";
		case "switch":
			return "toggle_on";
		case "checkbox":
			return "check_box";
		case "scaffold":
			return "view_quilt";
		case "container":
			return "pageless";
		case "card":
			return "team_dashboard";
		case "row":
			return "view_agenda";
		case "column":
			return "view_column_2";
		case "wrap":
			return "flex_wrap";
		case "list":
		case "listview":
		case "staticlistview":
		case "tableview":
		case "datatableview":
			return "view_list";
		case "gridview":
		case "staticgridview":
			return "grid_view";
		case "pageview":
		case "staticpageview":
			return "dual_screen";
		case "appbar":
			return "toolbar";
		case "sizedbox":
			return "select";
		case "textbutton":
		case "elevatedbutton":
		case "outlinedbutton":
		case "floatingactionbutton":
		case "iconbutton":
			return "smart_button";
		case "inkwell":
			return "touch_app";
		case "icon":
			return "account_box";
		case "image":
		case "imageurl":
		case "imageasset":
			return "image";
		case "datepicker":
			return "calendar_month";
		case "avatar":
		case "circleavatar":
			return "account_circle";
		case "tabbar":
		case "tabview":
		case "tabbarview":
			return "tabs";
		case "drawer":
			return "menu";
		case "drawerheader":
			return "subheader";
		case "userdrawerheader":
			return "insert_emoticon";
		case "circularprogressindicator":
			return "progress_activity";
		case "blocbuilder":
		case "blocconsumer":
			return "construction";
		case "navigationrail":
			return "side_navigation";
		case "bottomappbar":
		case "bottomnavigationbar":
			return "bottom_navigation";
		case "popupmenu":
		case "popupmenubutton":
			return "more_vert";
		case "select":
		case "dropdown":
		case "dropdownbutton":
			return "list";
		case "slider":
			return "tune";
		case "hero":
			return "domino_mask";
		case "animatedcontainer":
		case "animatedpositioned":
			return "transition_chop";
		case "center":
			return "center_focus_weak";
		case "stack":
			return "stacks";
		case "positioned":
			return "target";
		case "expanded":
			return "pan_zoom";
		case "component":
		case "widgetcomponent":
		case "preferredsizecomponent":
			return "link";
		case "scrollview":
		case "singlechildscrollview":
			return "swipe_vertical";
		default:
			return "view_compact";
			return "fullscreen";
	}
}

function invertColor(hex, bw) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
	if (hex.length === 8) {
        hex = hex.slice(2);
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    var r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16);
    if (bw) {
        // https://stackoverflow.com/a/3943023/112731
        return (r * 0.299 + g * 0.587 + b * 0.114) > 186
            ? '#000000'
            : '#FFFFFF';
    }
    // invert color components
    r = (255 - r).toString(16);
    g = (255 - g).toString(16);
    b = (255 - b).toString(16);
    // pad each with zeros and return
    return "#" + padLeft(r, '0', 2) + padLeft(g, '0', 2) + padLeft(b, '0', 2);
}

function padLeft(str, char, len) {
    len = len || 2;
    var zeros = new Array(len).join(char);
    return (zeros + str).slice(-len);
}

function mergeMaps(map1, map2, replace = false) {
	for (let key in map2) {
		if (replace || !map1.hasOwnProperty(key)) {
			map1[key] = map2[key];
		}
	}
}

function getUUID() {
	var s = [];
	var hexDigits = "0123456789abcdef";
	for (var i = 0; i < 36; i++)
		s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
	s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
	s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
	s[8] = s[13] = s[18] = s[23] = "-";
	var uuid = s.join("");
	return uuid;
};

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

class EditorPanel {
	constructor() { }
	populate() { }
	selectNode(node) { }
	onNodeCreated(origin, node, screen) { }
	onNodeUpdated(origin, node, screen) { }
	onNodeDeleted(origin, node, screen) { }
}
