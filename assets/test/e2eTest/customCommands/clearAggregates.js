const EventEmitter = require('events');

class ClearAggregates extends EventEmitter {
    command(_cb) {
        this.api
            .execute(function() {
                let aggs = DagAggManager.Instance.getAggMap();
                for (agg in aggs) {
                    DagAggManager.Instance.removeAgg(agg);
                }
                return true;
            }, [], null);

        this.emit('complete');
        return this;
    }
}

module.exports = ClearAggregates;