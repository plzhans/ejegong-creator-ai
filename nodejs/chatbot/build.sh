#!/bin/bash
echo service-base build...
NODE_ENV=dev npm --prefix nodejs/service-base install
NODE_ENV=dev npm --prefix nodejs/service-base run build

echo chatbot build...
rm -rf nodejs/chatbot/dist
NODE_ENV=dev npm --prefix nodejs/chatbot install
NODE_ENV=dev npm --prefix nodejs/chatbot run build