# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /src

RUN corepack enable
COPY . .
RUN yarn install --frozen-lockfile --non-interactive

RUN yarn build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist/spa /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
