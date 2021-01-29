
const EventEmitter = require('events');

class IsPresent extends EventEmitter {
    command(selector, cb) {
        // execute all nodes
        this.api.elements('css selector', selector, results => {
            if (results.value.length > 0) { // exists, check if visible
                this.api.isVisible(selector, results => {
                    cb(results.value != null);
                    this.emit('complete');
                });
            } else { // does not exists\
                cb(false);
                this.emit('complete');
            }
        });
        return this;
    }
}

  module.exports = IsPresent;