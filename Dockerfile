FROM --platform=linux/arm64 node:latest AS build
WORKDIR /build
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm ci
COPY public/ public
COPY src/ src
COPY .env .env
RUN npm run build

FROM --platform=linux/arm64 httpd:alpine
WORKDIR /usr/local/apache2/htdocs
COPY --from=build /build/build/ .
COPY httpd.conf /usr/local/apache2/conf/httpd.conf

EXPOSE 80
CMD ["httpd-foreground"]