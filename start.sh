#!/bin/bash

# Pull the latest Version from GitHub
git pull
npm install

# Perform tests + code coverage
npm run test
npm run code-coverage

# Report results to sonarcloud.io
npm run sonar

# Run program
npm run remote