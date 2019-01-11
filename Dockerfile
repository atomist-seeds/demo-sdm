FROM atomist/sdm-base:0.0.1

RUN apt-get update && apt-get install -y \
        openjdk-8-jdk
RUN apt-get update  && apt-get install -y \
        maven \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

VOLUME /opt/app
