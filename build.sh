#!/bin/bash

# TO INSTALL NODE V9 ON UBUNTU 16.04:
# curl -sL https://deb.nodesource.com/setup_9.x -o nodesource_setup.sh
# bash nodesource_setup.sh
# apt-get install nodejs
# apt-get install build-essential

rm -rf .sapper/ templates/.main.rendered.js

npm run build

node-deb -- server.js .sapper/ assets/ routes/ server/ templates/ webpack.client.config.js webpack.server.config.js

rm -rf .sapper/ templates/.main.rendered.js
