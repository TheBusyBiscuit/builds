#!/bin/bash

echo "Pulling the latest Version from GitHub..."
git pull

echo "Installing dependencies..."
npm install

echo "Performing Unit Tests..."
npm run test

echo "Uploading results..."
npm run sonar