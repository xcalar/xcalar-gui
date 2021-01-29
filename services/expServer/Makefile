.PHONY: all deploy archive build run clean image fix


SERVER ?= authentication
NOW = $(shell date +'%Y%m%d-%H%M')
NAME ?= appserver
GIT_SHA1=$(shell git rev-parse --short=8 HEAD)
ARCHIVE := $(NAME)-$(NOW)-$(GIT_SHA1).tar.gz
DESTDIR ?= /srv/apps/$(NAME)-$(NOW)
FILES = expServer.js expServerSupport.js expServerXcConsole.js route/tutorial.js route/installer.js route/login.js route/service.js socket.js sqlRestfulServer.js supportStatusFile.js tail.js upload.js

all:
	@echo "deploy    - deploy to $(SERVER)"
	@echo "archive   - build archive file ($(ARCHIVE))"
	@echo "build     - build docker image"
	@echo "run       - run docker image"
	@echo "debug     - run a shell"

archive: $(ARCHIVE)

$(ARCHIVE): $(FILES)
	fakeroot tar czvf $@ $^

httpStatus.js: ../../ts/httpStatus.js
	cp $< $@

# In docker we don't have access to outside of this directory. Here we copy the one
# externally accessed file, fix the require then reset it when done
fix: httpStatus.js
	sed -r -i 's@\.\./\.\./\.\./assets/js/httpStatus.js@../httpStatus.js@g' route/installer.js route/login.js
	sed -r -i 's@\.\./\.\./assets/js/httpStatus.js@./httpStatus.js@g' expServerSupport.js tail.js

deploy: $(ARCHIVE)
	gcloud compute ssh $(SERVER) --command="sudo mkdir -p $(DESTDIR)"
	cat $< | gcloud compute ssh $(SERVER) --command="sudo tar zxvf - --no-same-owner -C $(DESTDIR)"
	gcloud compute ssh $(SERVER) --command="cd $(DESTDIR) && sudo make run GIT_SHA1=$(GIT_SHA1) NOW=$(NOW) && echo $(GIT_SHA1) | sudo tee GIT_SHA1 && sudo ln -sfn $(NAME)-$(NOW) ../appserver"
	gcloud compute ssh $(SERVER) --command="sudo service caddy restart"

build: fix
	docker build -t $(NAME) .
	git checkout -- expServerSupport.js route/installer.js route/login.js tail.js
	rm httpStatus.js

run: build
	@-docker stop $(NAME) 2>/dev/null
	@-docker rm -f $(NAME) 2>/dev/null
	docker run -p 12124:12124 -v /etc/xcalar:/etc/xcalar -v /var/log:/var/log --restart=always --name=$(NAME) -d $(NAME)


debug: build
	@-docker stop $(NAME) 2>/dev/null
	@-docker rm -f $(NAME) 2>/dev/null
	docker run -it -p 12124:12124 -v /var/tmp/uploads:/var/tmp/uploads -v /etc/xcalar:/etc/xcalar -v /var/log:/var/log --restart=always --name=$(NAME) $(NAME) /bin/bash -l

clean:
	-rm -vf $(NAME)-*.tar.gz
