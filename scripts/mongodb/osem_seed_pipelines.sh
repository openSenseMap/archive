#!/bin/bash

USER=${OSEM_dbuser:-"admin"}
DATABASE=OSeM-api
PASS=${OSEM_dbuserpass:-"admin"}

echo "Going to run aggregation"
mongo --username $USER --password $PASS --authenticationDatabase OSeM-api < /functions/aggregations.js
echo "Aggregation finished"

echo "Going to export boxes and sensors as csv"
mongoexport --uri="mongodb://localhost:27017" --db=OSeM-api --collection=device --type=csv --fields="id,name,exposure,use_auth,created_at,updated_at,latitude,longitude" --out="/exports/device.csv"
mongoexport --uri="mongodb://localhost:27017" --db=OSeM-api --collection=sensor --type=csv --fields="id,title,sensor_type,unit,device_id" --out="/exports/sensor.csv"
mongoexport --uri="mongodb://localhost:27017" --db=OSeM-api --collection=measurement --type=csv --fields="sensor_id,time,value" --out="/exports/measurement.csv"
echo "Export finished"
