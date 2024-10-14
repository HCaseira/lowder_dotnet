class Routing {
    constructor() {
        this.hOffset = 20;
        this.vOffset = 20;
        this.hEdgeOffset = 0;
        this.vEdgeOffset = 0;
        this.laneWidth = 4;
        this.hAlign = "center";
        this.vAlign = "center";
        this.termination = "arrow";
        this.gridLanes = {};
        this.inPositions = ["top", "left"];
        this.outPositions = ["right", /*"bottom"*/];
    }

    getRoute(start, finish) {
        const positions = this.getPositions(start, finish);
        const points = [];
        this.addEdgePoint(start, positions.outPos, points);
        const outAxis = positions.outPos === "right" || positions.outPos === "left";
        const inAxis = positions.inPos === "right" || positions.inPos === "left";

        // Neighbours X
        if ((finish.xIndex - start.xIndex === 1 && positions.outPos === "right" && positions.inPos === "left") ||
            (finish.xIndex - start.xIndex === -1 && positions.outPos === "left" && positions.inPos === "right")) {
            if (finish.yIndex !== start.yIndex || Math.abs(start.top - finish.top) > 20) {
                this.addOutInflectionPoint(start, finish, positions, points);
                this.addLastInflectionPoint(finish, positions, points);
            }
        }

        // Neighbours Y
        else if ((finish.yIndex - start.yIndex === 1 && positions.outPos === "bottom" && positions.inPos === "top") ||
            (finish.yIndex - start.yIndex === -1 && positions.outPos === "top" && positions.inPos === "bottom")) {
            if (finish.xIndex !== start.xIndex || Math.abs(start.left - finish.left) > 20) {
                this.addOutInflectionPoint(start, finish, positions, points);
                this.addLastInflectionPoint(finish, positions, points);
            }
        }

        else {
            this.addOutInflectionPoint(start, finish, positions, points);
            this.addSecondInflectionPoint(start, finish, positions, points);
            if (outAxis === inAxis)
                this.addThirdInflectionPoint(start, finish, positions, points);
            this.addLastInflectionPoint(finish, positions, points);
        }
        this.addEdgePoint(finish, positions.inPos, points);

        if (this.termination === "arrow")
            this.addTerminationArrow(points);

        const radius = 6;
        let prevX, x, prevY, y;
        let pathString = "";
        let previousPoint = null;
        for (let i = 0; i < points.length; i++) {
            let p = points[i];
            x = p.x;
            y = p.y;

            if (i > 0) {
                let r = radius;
                // if (p.x != previousPoint.x)
                //     r = Math.min(r, Math.abs(p.x - previousPoint.x)/2);
                // if (p.y != previousPoint.y)
                //     r = Math.min(r, Math.abs(p.y - previousPoint.y)/2);
                if (i > 1 && i < points.length - 4) {
                    // Create a rounded corner
                    let flag = "0,0";
                    if (previousPoint.x === p.x) {
                        y = previousPoint.y > p.y ? y = previousPoint.y - r : previousPoint.y + r;
                        if (x > prevX && y > prevY || x < prevX && y < prevY)
                            flag = "0,1";
                    }

                    else {
                        x = previousPoint.x > p.x ? x = previousPoint.x - r : previousPoint.x + r;
                        if (x > prevX && y < prevY || x < prevX && y > prevY)
                            flag = "0,1";
                    }
                    pathString += " A" + r + "," + r + " 0 " + flag + " " + x + "," + y;
                }

                x = p.x;
                y = p.y;
                if (i < points.length - 5) {
                    if (previousPoint.x === p.x)
                        y = previousPoint.y > p.y ? p.y + r : p.y - r;

                    else
                        x = previousPoint.x < p.x ? p.x - r : p.x + r;
                }
                pathString += " L" + x + "," + y;
            }

            else
                pathString += "M" + x + "," + y;
            prevX = x;
            prevY = y;
            previousPoint = p;
        }

        return pathString;
    }

    addOutInflectionPoint(start, finish, positions, points) {
        var lane;
        switch (positions.outPos) {
            case "right":
                lane = this.getEmptyXLane(start.xIndex, start.code, "outLane");
                points.push({ x: points[0].x + this.hOffset + (this.laneWidth * (lane + 1)), y: points[0].y });
                break;
            case "left":
                lane = this.getEmptyXLane(start.xIndex - 1, start.code, "outLane");
                points.push({ x: points[0].x - this.hOffset - (this.laneWidth * (lane + 1)), y: points[0].y });
                break;
            case "bottom":
                lane = this.getEmptyYLane(start.yIndex, start.code, "outLane");
                points.push({ x: points[0].x, y: points[0].y + this.vOffset + (this.laneWidth * (lane + 1)) });
                break;
            case "top":
                lane = this.getEmptyYLane(start.yIndex - 1, start.code, "outLane");
                points.push({ x: points[0].x, y: points[0].y - this.vOffset - (this.laneWidth * (lane + 1)) });
                break;
            default: break;
        }
    }

    addSecondInflectionPoint(start, finish, positions, points) {
        var lane;
        var inPos = positions.inPos;

        if ((positions.outPos === "right" || positions.outPos === "left") && (inPos === "right" || inPos === "left")) {
            if (start.yIndex > finish.yIndex)
                inPos = "bottom";

            else
                inPos = "top";
        }
        else if ((positions.outPos === "top" || positions.outPos === "bottom") && (inPos === "top" || inPos === "bottom")) {
            if (start.xIndex > finish.xIndex)
                inPos = "right";

            else
                inPos = "left";
        }

        switch (inPos) {
            case "right":
                lane = this.getEmptyYLane(finish.yIndex, start.code, finish.code);
                points.push({ x: finish.right + this.hOffset + (this.laneWidth * (lane + 1)), y: points[points.length - 1].y });
                break;
            case "left":
                lane = this.getEmptyYLane(finish.yIndex - 1, start.code, finish.code);
                points.push({ x: finish.left - this.hOffset - (this.laneWidth * (lane + 1)), y: points[points.length - 1].y });
                break;
            case "bottom":
                lane = this.getEmptyXLane(finish.xIndex, start.code, finish.code);
                points.push({ x: points[points.length - 1].x, y: finish.bottom + this.vOffset + (this.laneWidth * (lane + 1)) });
                break;
            case "top":
                lane = this.getEmptyXLane(finish.xIndex - 1, start.code, finish.code);
                points.push({ x: points[points.length - 1].x, y: finish.top - this.vOffset - (this.laneWidth * (lane + 1)) });
                break;
            default: break;
        }
    }

    addThirdInflectionPoint(start, finish, positions, points) {
        var lane;
        switch (positions.inPos) {
            case "right":
                lane = this.getEmptyXLane(finish.xIndex, "inLane", finish.code);
                points.push({ x: finish.right + this.hOffset + (this.laneWidth * (lane + 1)), y: points[points.length - 1].y });
                break;
            case "left":
                lane = this.getEmptyXLane(finish.xIndex - 1, "inLane", finish.code);
                points.push({ x: finish.left - this.hOffset - (this.laneWidth * (lane + 1)), y: points[points.length - 1].y });
                break;
            case "bottom":
                lane = this.getEmptyYLane(finish.yIndex, "inLane", finish.code);
                points.push({ x: points[points.length - 1].x, y: finish.bottom + this.vOffset + (this.laneWidth * (lane + 1)) });
                break;
            case "top":
                lane = this.getEmptyYLane(finish.yIndex - 1, "inLane", finish.code);
                points.push({ x: points[points.length - 1].x, y: finish.top - this.vOffset - (this.laneWidth * (lane + 1)) });
                break;
            default: break;
        }
    }

    addLastInflectionPoint(finish, positions, points) {
        switch (positions.inPos) {
            case "left":
            case "right":
                points.push({ x: points[points.length - 1].x, y: this.getObjEdgePoint(finish, false) + this.vEdgeOffset });
                break;
            case "top":
            case "bottom":
                points.push({ x: this.getObjEdgePoint(finish, true) + this.hEdgeOffset, y: points[points.length - 1].y });
                break;
            default: break;
        }
    }

    addEdgePoint(obj, position, points) {
        switch (position) {
            case "left":
                points.push({ x: obj.left, y: this.getObjEdgePoint(obj, false) + this.vEdgeOffset });
                break;
            case "top":
                points.push({ x: this.getObjEdgePoint(obj, true) + this.hEdgeOffset, y: obj.top });
                break;
            case "right":
                points.push({ x: obj.right, y: this.getObjEdgePoint(obj, false) + this.vEdgeOffset });
                break;
            case "bottom":
                points.push({ x: this.getObjEdgePoint(obj, true) + this.hEdgeOffset, y: obj.bottom });
                break;
            default:
                break;
        }
    }

    getObjEdgePoint(obj, horizontal) {
        if (horizontal) {
            switch (this.hAlign) {
                case "center":
                    return (obj.right - obj.left) / 2 + obj.left;
                case "right":
                    return obj.right;
                default:
                    return obj.left;
            }
        }

        else {
            switch (this.vAlign) {
                case "center":
                    return (obj.bottom - obj.top) / 2 + obj.top;
                case "bottom":
                    return obj.bottom;
                default:
                    return obj.top;
            }
        }
    }

    addTerminationArrow(points) {
        var arrowHeight = 10;
        var fromX = points[points.length - 2].x;
        var fromY = points[points.length - 2].y;
        var toX = points[points.length - 1].x;
        var toY = points[points.length - 1].y;
        var angle = Math.atan2(toY - fromY, toX - fromX);
        points.push({ x: toX - arrowHeight * Math.cos(angle - Math.PI / 6), y: toY - arrowHeight * Math.sin(angle - Math.PI / 6) });
        points.push({ x: toX, y: toY });
        points.push({ x: toX - arrowHeight * Math.cos(angle + Math.PI / 6), y: toY - arrowHeight * Math.sin(angle + Math.PI / 6) });
        points.push({ x: toX, y: toY });
    }

    getPositions(start, finish) {
        var i, j;
        var minCost = null;
        var inPosition = null;
        var outPosition = null;

        for (i = 0; i < this.outPositions.length; i++) {
            var cost = 4;
            var outP = this.outPositions[i];
            for (j = 0; j < this.inPositions.length; j++) {
                var inP = this.inPositions[j];
                var outAxis = outP === "right" || outP === "left";
                var inAxis = inP === "right" || inP === "left";

                // Neighbours X
                if ((finish.xIndex - start.xIndex === 1 && outP === "right" && inP === "left") ||
                    (finish.xIndex - start.xIndex === -1 && outP === "left" && inP === "right")) {
                    cost = 0;
                    if (finish.yIndex !== start.yIndex)
                        cost = 2;
                }

                // Neighbours Y
                else if ((finish.yIndex - start.yIndex === 1 && outP === "bottom" && inP === "top") ||
                    (finish.yIndex - start.yIndex === -1 && outP === "top" && inP === "bottom")) {
                    cost = 0;
                    if (finish.xIndex !== start.xIndex)
                        cost = 2;
                }
                else if (outAxis !== inAxis)
                    cost = 3;

                if (minCost === null || minCost > cost) {
                    minCost = cost;
                    inPosition = inP;
                    outPosition = outP;
                }
            }
        }
        return { inPos: inPosition, outPos: outPosition };
    }

    getEmptyXLane(xIndex, start, finish) {
        var i = 0;
        delete this.gridLanes[this.gridLanes["x_" + start + "_" + finish]];
        while (this.gridLanes["x_" + xIndex + "_" + i])
            i++;
        this.gridLanes["x_" + start + "_" + finish] = "x_" + xIndex + "_" + i;
        this.gridLanes["x_" + xIndex + "_" + i] = start + "_" + finish;
        return i;
    }
    
    getEmptyYLane(yIndex, start, finish) {
        var i = 0;
        delete this.gridLanes[this.gridLanes["y_" + start + "_" + finish]];
        while (this.gridLanes["y_" + yIndex + "_" + i])
            i++;
        this.gridLanes["y_" + start + "_" + finish] = "y_" + yIndex + "_" + i;
        this.gridLanes["y_" + yIndex + "_" + i] = start + "_" + finish;
        return i;
    }
}
