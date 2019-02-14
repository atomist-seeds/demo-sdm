FROM atomist/sdm-base:0.0.1

RUN apt-get update && apt-get install -y \
        openjdk-8-jdk \
        maven \
    && rm -rf /var/lib/apt/lists/*

VOLUME /opt/app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .
