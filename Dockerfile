FROM atomist/sdm-base:0.0.1

# using /sdm as directory is required so that kaniko could use /opt
RUN mkdir -p /sdm/app

WORKDIR /sdm/app

CMD ["/sdm/app/node_modules/.bin/atm-start"]

RUN apt-get update && apt-get install -y \
        openjdk-8-jdk \
        maven \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci \
    && npm cache clean --force

COPY . .

# declaring a volume will instruct kaniko to skip the directory when snapshotting
VOLUME /sdm
