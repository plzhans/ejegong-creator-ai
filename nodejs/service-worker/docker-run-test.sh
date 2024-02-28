#!/bin/bash

docker build -f ./Dockerfile -t temp/ejegong-creator-ai-service-worker:latest ../ 

docker run --name ejegong-creator-ai-service-worker \
           --rm \
           --env-file .env \
           --dns 8.8.8.8 \
           temp/ejegong-creator-ai-service-worker:latest
