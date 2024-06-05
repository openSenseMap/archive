#!/bin/bash

USER=${OSEM_dbuser:-"admin"}
DATABASE=OSeM-api
PASS=${OSEM_dbuserpass:-"admin"}

for filename in /exports/*; do
  [ -e "$filename" ] || continue
  echo "Going to restore file: $filename"
  mongorestore --db OSeM-api --username $USER --password $PASS --authenticationDatabase OSeM-api --gzip --archive=$filename
  echo "Export restored: $filename"
done
