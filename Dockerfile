FROM atomist/sdm-base:0.4.0-20191204153918

COPY package.json package-lock.json ./

RUN npm ci \
    && npm cache clean --force

COPY . ./
