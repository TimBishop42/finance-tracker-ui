# The build stage only produces static files, so it runs natively on whatever
# machine builds the image (no slow, memory-hungry x86 emulation on Apple
# Silicon). Only the runtime image targets the NAS: build with
# `--platform linux/amd64` (see Justfile).
FROM --platform=$BUILDPLATFORM node:20-slim AS build
WORKDIR /build
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm ci
COPY public/ public
COPY src/ src
COPY .env .env
# No source maps in the shipped bundle: smaller, less build memory, and the
# source isn't served to the browser.
ENV GENERATE_SOURCEMAP=false
RUN npm run build

FROM httpd:alpine
WORKDIR /usr/local/apache2/htdocs
COPY --from=build /build/build/ .
COPY httpd.conf /usr/local/apache2/conf/httpd.conf

EXPOSE 80
CMD ["httpd-foreground"]
