FROM node:10-alpine

LABEL maintainer="Odd Networks <info@oddnetworks.com>"

RUN \
	mkdir -p /opt/app && \
	chmod -R 777 /opt/app && \
	apk update && \
	apk --no-cache --update add \
	bash make g++ python py-pip jq && \
	pip install awscli && \
	npm i -g npm

ENV PS1='$NODE_ENV-${debian_chroot:+($debian_chroot)}\u@\h:\w\$ ' \
	PROJECT_DIR=/opt/app \
	PATH=/opt/app/node_modules/.bin:$PATH

WORKDIR $PROJECT_DIR

EXPOSE 3001

CMD /bin/bash
