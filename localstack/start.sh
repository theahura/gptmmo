#!/bin/bash

# Ensure that the current working directory is the folder containing this file.
pushd "$( dirname "${BASH_SOURCE[0]}" )"

# We require running several services locally to emulate our production AWS
# environment. This command starts them all. See each referenced
# docker-compose.yaml file for details.
docker compose \
  --file ./docker-compose.yaml \
  --file ./localstack/docker-compose.yaml \
  up -d --no-recreate

# We use replica sets to synchronize data across multiple servers in our production
# infrastructure. We do the same locally to imitate production, and as such we need
# to run this command to initiate a replica set.
sleep 3
mongosh --eval 'rs.initiate();'

# Ensure our localstack configuration is up-to-date.
echo 'Syncing local AWS infrastructure...'
tfswitch
terraform init --upgrade
terraform apply --auto-approve

echo 'Done'
popd
