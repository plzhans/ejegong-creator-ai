FROM node:20.11.1-alpine

RUN mkdir -p /app/lib/useapi-lib \
    && mkdir -p /app/service-worker

COPY ./service-worker/entrypoint.sh /app/service-worker/

COPY ./service-worker/.nvmrc /app/service-worker/
COPY ./service-worker/package*.json /app/service-worker/
COPY ./lib/useapi-lib/package*.json /app/lib/useapi-lib/

COPY ./lib/useapi-lib/dist /app/lib/useapi-lib/dist
COPY ./service-worker/dist /app/service-worker/dist

WORKDIR /app/service-worker
RUN npm --prefix ../lib/useapi-lib install --production  \
    && npm install --production \
    && chmod +x ./entrypoint.sh

ENV NODE_ENV=production

VOLUME ["logs:/app/service-worker/logs"]

ENTRYPOINT ["./entrypoint.sh"]