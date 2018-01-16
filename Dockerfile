#
# This is a test Docker file for oddworks
# The purpose is to create a container that runs the current test suite on Node 8 LTS.
#

FROM node:8-alpine

# install python so bycrypt (in the oddworks node packages) can build
RUN apk add --update python make g++\
    # make the app directory
    && mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

RUN rm -r ./node_modules \
  && npm install \
  && npm cache clean --force

CMD ["npm", "test"]