describe('Concurrency Test', () => {
    before(() => {
        console.clear();
    });

    describe('Basic Structure Test', () => {
        it('should create an instance', () => {
            const mutex = new Mutex('test');
            const concurrency = new Concurrency(mutex);
            expect(concurrency).to.be.instanceof(Concurrency);
        });

        it('should handle error case', () => {
            try {
                const concurrency = new Concurrency();
            } catch (e) {
                expect(e).to.equal(ConcurrencyEnum.NoLock);
            }
        });
    });

    describe("Mutex tests", () => {
        let mutex;
        let concurrency;

        before(() => {
            mutex = new Mutex(xcHelper.randName("unitTestMutex"));
            concurrency = new Concurrency(mutex);
        });

        it("Lock call to uninited lock should fail", (done) => {
            const errMutex = new Mutex("notInited");
            const errConcurrency = new Concurrency(errMutex);
            concurrency.lock()
                .then(() => {
                    done("fail");
                })
                .fail((error) => {
                    expect(error).to.equal(ConcurrencyEnum.NoKVStore);
                    done();
                });
        });

        it("Unlock call to uninited lock should fail", (done) => {
            const errMutex = new Mutex("notInited");
            const errConcurrency = new Concurrency(errMutex);
            concurrency.unlock()
                .then(() => {
                    done("fail");
                })
                .fail((error) => {
                    expect(error).to.equal(ConcurrencyEnum.NoKey);
                    done();
                });
        });

        it("hasLockedValue call to uninited lock should fail", (done) => {
            const errMutex = new Mutex("notInited");
            const errConcurrency = new Concurrency(errMutex);
            concurrency.hasLockedValue()
                .then(() => {
                    done("fail");
                })
                .fail((error) => {
                    expect(error).to.equal(ConcurrencyEnum.NoKey);
                    done();
                });
        });

        it("isLocked call should work", () => {
            const res = concurrency.isLocked();
            expect(res).to.be.false;
        });

        it("should be able to get new lock", (done) => {
            concurrency.initLock()
                .then(() => {
                    return concurrency.lock();
                })
                .then(() => {
                    expect(concurrency.isLocked()).to.be.true;
                    done();
                })
                .fail(() => {
                    done('fail');
                });
        });

        it("should not be able to reinit already inited mutex", (done) => {
            concurrency.initLock()
                .then(() => {
                    done("Should not be able to double init");
                })
                .fail((error) => {
                    expect(error).to.equal(ConcurrencyEnum.AlreadyInit);
                    done();
                });
        });

        it("should not get lock after it's been locked", (done) => {
            concurrency.lock(1000)
                .then(() => {
                    done("Should not get lock!");
                })
                .fail((error) => {
                    expect(error).to.equal(ConcurrencyEnum.OverLimit);
                    done();
                });
        });

        it("should not be able to unlock with a wrong string", (done) => {
            const oldLockString = concurrency._lockString;
            concurrency._lockString = oldLockString.substring(1);
            concurrency.unlock()
                .then(() => {
                    return concurrency.hasLockedValue();
                })
                .then((locked) => {
                    expect(locked).to.be.true;
                    done();
                })
                .fail(() => {
                    done("Should not error out!");
                })
                .always(() => {
                    concurrency._lockString = oldLockString;
                });
        });

        it("should fail trylock since lock is held", (done) => {
            concurrency.tryLock()
                .then(() => {
                    done("Should fail trylock");
                })
                .fail((error) => {
                    expect(error).to.equal(ConcurrencyEnum.OverLimit);
                    done();
                });
        });

        it("should be able to unlock with correct lockString", (done) => {
            concurrency.unlock()
                .then(() => {
                    expect(concurrency.isLocked()).to.be.false;
                    done();
                })
                .fail(() => {
                    done("Should be able to unlock");
                });
        });

        it("should be able to get trylock", (done) => {
            concurrency.tryLock()
                .then((ls) => {
                    expect(concurrency.isLocked()).to.be.true;
                    done();
                })
                .fail(() => {
                    done("Should be able to get trylock");
                });
        });

        it("should be able to forcefully get the lock away", (done) => {
            const anotherConcurrency = new Concurrency(mutex);
            anotherConcurrency.forceUnlock()
                .then(() => {
                    return anotherConcurrency.hasLockedValue();
                })
                .then((locked) => {
                    expect(locked).to.equal.false;
                    done();
                })
                .fail(() => {
                    done("Should be able to forceUnlock anytime");
                });
        });

        it("should still unlock even though it's unlocked", (done) => {
            concurrency.unlock()
                .then(() => {
                    expect(concurrency.isLocked()).to.be.false;
                    done();
                })
                .fail(() => {
                    done("Should still be able to unlock");
                });
        });

        it("Concurrency test case", (done) => {
            // T1: Lock
            // T2: Try to lock
            // T1: After 200 ms, unlock
            // T2's lock call should be successful.

            // Start test by ensuring lock is unlocked
            let t1ls;
            let t2ls;

            concurrency.lock()
                .then((ls) => {
                    const deferred = PromiseHelper.deferred();
                    t1ls = ls;
                    setTimeout(() => {
                        concurrency.unlock()
                            .fail(() => {
                                done("should be able to unlock!");
                            });
                    }, 200);

                    setTimeout(() => {
                        concurrency.lock()
                            .then((ls) => {
                                t2ls = ls;
                                deferred.resolve();
                            })
                            .fail(() => {
                                done("Should be able to get the lock!");
                            });
                    }, 1);

                    return deferred.promise();
                })
                .then(function() {
                    expect(t2ls).to.not.equal(t1ls);
                    expect(t2ls).to.not.be.undefined;
                    expect(concurrency.isLocked()).to.be.true;
                    done();
                })
                .fail(() => {
                    done("should not fail anywhere");
                });
        });

        it("should delete lock", (done) => {
            concurrency.delLock()
                .then(() => {
                    return XcalarKeyLookup(mutex.key, mutex.scope);
                })
                .then((val) => {
                    expect(val).to.be.null;
                    done();
                })
                .fail(() => {
                    done("fail");
                });
        });

        after((done) => {
            XcalarKeyDelete(mutex.key, mutex.scope)
                .always(done);
        });
    });
});