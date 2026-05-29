#!/usr/bin/env bash
set -e
echo "Installing server dependencies..."
npm install --prefix server
echo "Installing client dependencies..."
npm install --prefix client
echo "Building React client..."
npm --prefix client run build
echo "Build complete."
