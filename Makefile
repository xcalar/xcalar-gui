SHELL=/bin/bash

UNAME := $(shell uname)

ifeq ($(UNAME),Linux)
	SHASUM=sha256sum
else
	SHASUM=shasum -a 256
endif

define package_sha
$(shell $(SHASUM) $(PACKAGE_LOCK) | cut -c1-8)
endef

define package_tar
~/.cache/npm/node_modules-$(shell $(SHASUM) $(PACKAGE_LOCK) | cut -c1-8).tar
endef

RC:=false
PRODUCT:=XD
PACKAGE      = package.json
PACKAGE_LOCK = package-lock.json
PACKAGE_SHA  = package-lock.sha1
CACHEFILE = node_modules-$(call package_sha,$(PACKAGE_LOCK)).tar
CACHE     = ~/.cache/npm/$(CACHEFILE)
CACHE_BASEURL ?= http://netstore.int.xcalar.com/infra/cache/npm/$(CACHEFILE)

ifeq ($(RC),true)
	GRUNT_EXTRA_FLAGS+=--rc
endif

GRUNT_EXTRA_FLAGS+= --product=$(PRODUCT)

all: setup_npm
	node_modules/grunt/bin/grunt installer $(GRUNT_EXTRA_FLAGS)
dev: setup_npm
	node_modules/grunt/bin/grunt dev $(GRUNT_EXTRA_FLAGS)
installer: setup_npm
	node_modules/grunt/bin/grunt $(NPM_GRUNT_COLOR) installer $(GRUNT_EXTRA_FLAGS)
trunk: setup_npm
	node_modules/grunt/bin/grunt trunk $(GRUNT_EXTRA_FLAGS)
debug: setup_npm
	node_modules/grunt/bin/grunt debug $(GRUNT_EXTRA_FLAGS)
clean:
	rm -rf node_modules

.PHONY: node_modules
node_modules: node_modules/.tstamp

node_modules/.tstamp: $(PACKAGE_LOCK)
	mkdir -p $(@D) ~/.cache/npm
	npm install --package-lock-only --save-dev
	test -e $(call package_tar) && tar xf $(call package_tar) node_modules/ || npm install $(NPM_GRUNT_COLOR) --save-dev
	test -e $(call package_tar) || tar cf $(call package_tar) --exclude=node_modules/.tstamp $(PACKAGE) $(PACKAGE_LOCK) node_modules/
	/bin/touch $@

setup_npm: node_modules/.tstamp
	node_modules/grunt/bin/grunt $(NPM_GRUNT_COLOR) init

$(PACKAGE_LOCK): $(PACKAGE)
	mkdir -p ~/.cache/npm
	npm install $(NPM_GRUNT_COLOR) --save-dev
	/bin/touch $@
