FROM node:latest AS build

WORKDIR /build



COPY package.json package.json



COPY package-lock.json package-lock.json


RUN npm ci



COPY public/ public



COPY src/ src

COPY .env .env

RUN npm run build



FROM httpd:alpine



WORKDIR /usr/local/apache2/htdocs



COPY --from=build /build/build/ .