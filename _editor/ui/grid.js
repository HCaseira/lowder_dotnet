class Grid {
    constructor(gridHolder) {
        this.holder = gridHolder;
        this.nodeToPosition = {};
        this.positionToNode = {};
    }

    getNodePosition(node) {
        return this.nodeToPosition[node.getId()];
    }
    
    getNextPosition(node, parentNode) {
        let x = 0;
        let y = 0;
        if (parentNode) {
            const pos = this.nodeToPosition[parentNode.getId()];
            x = pos.x + 1;
            y = pos.y;
        }
        while (this.positionToNode[x + "-" + y]) {
            y++;
        }

        const pos = { x, y };
        this.positionToNode[x + "-" + y] = node;
        this.nodeToPosition[node.getId()] = pos;
        return pos;
    }
}
