#!/bin/bash

echo "Pulling the latest Version from GitHub..."
git pull

echo "Installing dependencies..."
npm install

if  ["$1" == "--sonar"]; then
	echo "Performing Unit Tests..."
	npm run test

	echo "Measuring Test Coverage..."
	npm run code-coverage

	echo "Uploading results..."
	npm run sonar
fi

echo "Running the remote program..."
npm run remote