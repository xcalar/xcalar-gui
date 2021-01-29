class DropAsYouGo {
    /**
     * Main function in DropAsYouGo, which has two implemenations to invoke
     * @param opNode The Xcalar operator node
     * @param dropSrcTables A boolean flag for dropping source tables
     * @param backDAYG A boolean flag for using backend DAYG
     */
    static addDrops(
        opNode: XcOpNode,
        visitedMap: {[name: string]: boolean},
        options: {
            optimizations: {}
        }
    ): XcOpNode {
        if (options.optimizations["backDAYG"]) {
            DropAsYouGo.addBackDrops(opNode, visitedMap);
        } else {
            DropAsYouGo.addFrontDrops(opNode, options.optimizations["dropSrcTables"],
                                      {}, visitedMap);
        }
        return opNode;
    }

    /**
     * Backend DAYG by specifying a flag in each operator
     * @param opNode The Xcalar operator node
     * @param visitedMap A map to record visited node while traversing
     */
    static addBackDrops(
        opNode: XcOpNode,
        visitedMap: {[name: string]: boolean}
    ): void {
        if (visitedMap[opNode.name]) {
            return;
        }
        opNode.value.state = "Dropped";
        for (var i = 0; i < opNode.children.length; i++) {
            this.addBackDrops(opNode.children[i], visitedMap);
        }
        visitedMap[opNode.name] = true;
    }

    /**
     * Frontend DAYG by inserting XcalarDeleteObjects operation
     * @param opNode The Xcalar operator node
     * @param dropSrcTables A boolean flag for dropping source tables
     * @param dependencyMap A map to record the number of dependcies of a table
     * @param visitedMap A map to record visited node while traversing
     */
    static addFrontDrops(
        opNode: XcOpNode,
        dropSrcTables: boolean,
        dependencyMap: {[name: string]: number},
        visitedMap: {[name: string]: boolean}
    ) {
        if (visitedMap[opNode.name]) {
            return;
        }
        dependencyMap[opNode.name] = opNode.parents.length;
        for (let i = 0; i < opNode.children.length; i++) {
            this.addFrontDrops(opNode.children[i], dropSrcTables, dependencyMap,
                                                                    visitedMap);
        }
        if (opNode.children.length === 0 && dropSrcTables) {
            SQLUtil.assert(opNode.sources.length === 1,
                           SQLErrTStr.SingleOperatorQueryMultipleSource);
            opNode.toDrop = [opNode.sources[0]];
        }
        if (opNode.children.length > 0) {
            for (let source of opNode.sources) {
                dependencyMap[source] -= 1;
                if (dependencyMap[source] === 0) {
                    if (!opNode.toDrop) {
                        opNode.toDrop = [];
                    }
                    opNode.toDrop.push(source);
                }
            }
        }
        visitedMap[opNode.name] = true;
    }
}
if (typeof exports !== "undefined") {
    exports.DropAsYouGo = DropAsYouGo;
}