# Justfile

# Build Docker image
build:
    docker build -t finance-ui .

# Tag Docker image
tag:
    docker tag finance-ui tbished/finance-ui:latest

# Push Docker image
push:
    docker push tbished/finance-ui:latest 

# Full sequence: build -> tag -> push
publish: build tag push