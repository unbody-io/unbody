#!/bin/bash

# Initialize temporal search attributes on first run
#

set -e

temporal server start-dev --ip 0.0.0.0 &
SERVER_PID=$!

INIT_FLAG="/home/temporal/init-done.flag"

if [ ! -f "$INIT_FLAG" ]; then
  echo "Running first-time initialization..."
  
  sleep 3
  
  echo "Creating search attributes..."
  temporal operator search-attribute create --name "eventType" --type="Keyword"
  temporal operator search-attribute create --name "recordId" --type="Keyword"
  temporal operator search-attribute create --name "sourceId" --type="Keyword"
  
  touch $INIT_FLAG
  echo "Init done."
fi

wait $SERVER_PID
