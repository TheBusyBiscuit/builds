#!/bin/bash

echo "Pulling the latest Version from GitHub..."
git pull

echo "Installing dependencies..."
npm install

echo "Running the remote program..."
npm run remote