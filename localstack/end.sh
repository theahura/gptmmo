#!/bin/bash

read -p "WARNING: Running this script will result in data loss of the entire 
local environment. Are you sure you want to continue? (y for yes) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then

# Ensure that the current working directory is the folder containing this file.
pushd "$( dirname "${BASH_SOURCE[0]}" )"

docker compose \
  --file ./docker-compose.yaml \
  --file ./telemetry/docker-compose.yaml \
  --file ./plane.dev/docker-compose.yaml \
  --file ./localstack/docker-compose.yaml \
  down

echo 'Done'
popd

fi
