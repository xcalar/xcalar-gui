const {Worker} = require('worker_threads');
const join = require("path").join;
const xcConsole = require('../utils/expServerXcConsole.js');

module.exports = class Pool {
    constructor(opts) {
        opts = opts || {};
        this._workers = new Map();
        this._queue = [];
        this._max = opts.max || 1;
        this._maxWaiting = opts.maxWaiting || Infinity;

        const fileName = opts.fileName;
        const path = join(__dirname, fileName);
        for (let i = 0; i < opts.max; i++) {
            // Spawn fixed number of workers
            this.spawn(path);
        }
    }

    get size() {
        return this._workers.size;
    }

    submit(deferred, data) {
        if (this._queue.length === this._maxWaiting) {
            throw new Error('Pool queue is full');
            return;
        }
        this._queue.push({deferred: deferred, data: data});
        this.scheduler();
        return;
    }
    scheduler() {
        if (this._queue.length === 0) {
            return;
        } else {
            for (const entry of this._workers) {
                const worker = entry[0];
                const preDeferred = entry[1];
                if (!preDeferred && this._queue.length > 0) {
                    const {deferred, data} = this._queue.shift();
                    this._workers.set(worker, deferred);
                    worker.postMessage(data);
                }
            }
        }
    }

    reset(worker) {
        this._workers.set(worker, null);
        this.scheduler();
    }

    spawn(path) {
        const worker = new Worker(path);
        worker.on('message', (ret) => {
            const deferred = this._workers.get(worker);
            if (deferred) {
                if (ret.success) {
                    deferred.resolve(ret.data);
                } else {
                    deferred.reject(ret.error);
                }
            }
            this.reset(worker);
        })
        worker.on('error', (err) => {
            const deferred = this._workers.get(worker);
            xcConsole.log("Worker error: ", err);
            if (deferred) {
                deferred.reject(err);
            }
        });
        worker.on('exit', (code) => {
            const deferred = this._workers.get(worker);
            xcConsole.log("Worker exited with ", code);
            if (deferred) {
                if(code != 0) {
                    deferred.reject(`Worker stopped with exit code ${code}`);
                }
                deferred.resolve("Worker stopped without error");
            }
            this._workers.delete(worker);
            this.spawn(path);
        });
        this.reset(worker);
        xcConsole.log("Worker spawned, current pool size: ", this._workers.size);
    }

    destroy () {
        for (let entry of this._workers) {
            const worker = entry[0];
            worker.terminate();
        }
    }
}