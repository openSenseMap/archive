#!/bin/bash

USER=${OSEM_dbuser:-"admin"}
DATABASE=OSeM-api
PASS=${OSEM_dbuserpass:-"admin"}

for filename in /dumps/*; do
  [ -e "$filename" ] || continue
  echo "Going to restore dump: $filename"
  mongorestore --db OSeM-api --username $USER --password $PASS --authenticationDatabase OSeM-api --gzip --archive=$filename
  echo "Dump restored: $filename"
done
