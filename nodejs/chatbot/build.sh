#!/bin/bash
echo service-base build...
npm --prefix nodejs/service-base install
npm --prefix nodejs/service-base run build

echo chatbot build...
rm -rf nodejs/chatbot/dist
npm --prefix nodejs/chatbot install
npm --prefix nodejs/chatbot run build