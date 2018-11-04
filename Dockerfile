FROM ubuntu:18.04

LABEL maintainer="Atomist <docker@atomist.com>"
LABEL version="1.0.0"
LABEL repository="http://github.com/atomist-seeds/demo-sdm"
LABEL homepage="http://github.com/atomist-seeds/demo-sdm"

LABEL com.github.actions.name="Demo SDM"
LABEL com.github.actions.description="An Atomist SDM to deliver Spring services to a k8 cluster"
LABEL com.github.actions.icon="globe"
LABEL com.github.actions.color="green"

RUN apt-get update && apt-get install -y \
        curl \
    && rm -rf /var/lib/apt/lists/*

ENV DUMB_INIT_VERSION=1.2.2

RUN curl -s -L -O https://github.com/Yelp/dumb-init/releases/download/v$DUMB_INIT_VERSION/dumb-init_${DUMB_INIT_VERSION}_amd64.deb \
    && dpkg -i dumb-init_${DUMB_INIT_VERSION}_amd64.deb \
    && rm -f dumb-init_${DUMB_INIT_VERSION}_amd64.deb

RUN mkdir -p /opt/app

WORKDIR /opt/app

EXPOSE 2866

ENV BLUEBIRD_WARNINGS 0
ENV NODE_ENV production
ENV NPM_CONFIG_LOGLEVEL warn
ENV SUPPRESS_NO_CONFIG_WARNING true

ENTRYPOINT ["dumb-init", "node", "--trace-warnings", "--expose_gc", "--optimize_for_size", "--always_compact", "--max_old_space_size=384"]

CMD ["/opt/app/node_modules/.bin/atm-start"]

RUN apt-get update && apt-get install -y \
        build-essential \
        docker.io \
        git \
        openjdk-8-jdk
RUN apt-get update  && apt-get install -y \
        maven \
    && rm -rf /var/lib/apt/lists/*

RUN git config --global user.email "bot@atomist.com" \
    && git config --global user.name "Atomist Bot"

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci

COPY . .
