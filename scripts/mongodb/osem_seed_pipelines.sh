#!/bin/bash

USER=${OSEM_dbuser:-"admin"}
DATABASE=OSeM-api
PASS=${OSEM_dbuserpass:-"admin"}

echo "Going to run aggregation"
mongosh --username $USER --password $PASS --authenticationDatabase OSeM-api < /functions/aggregations.js
echo "Aggregation finished"

echo "Going to export boxes and sensors as csv"
mongoexport --uri="mongodb://localhost:27017" --db=OSeM-api --collection=user --type=csv --fields="id,name,email,role,email_is_confirmed,created_at,updated_at" --out="/exports/user.csv"
mongoexport --uri="mongodb://localhost:27017" --db=OSeM-api --collection=password --type=csv --fields="user_id,hash" --out="/exports/password.csv"
mongoexport --uri="mongodb://localhost:27017" --db=OSeM-api --collection=profile --type=csv --fields="id,username,user_id" --out="/exports/profile.csv"
mongoexport --uri="mongodb://localhost:27017" --db=OSeM-api --collection=device --type=csv --fields="id,name,exposure,use_auth,created_at,updated_at,latitude,longitude,user_id" --out="/exports/device.csv"
mongoexport --uri="mongodb://localhost:27017" --db=OSeM-api --collection=sensor --type=csv --fields="id,title,sensor_type,unit,device_id" --out="/exports/sensor.csv"
mongoexport --uri="mongodb://localhost:27017" --db=OSeM-api --collection=measurement --type=csv --fields="sensor_id,time,value,latitude,longitude" --out="/exports/measurement.csv"
mongoexport --uri="mongodb://localhost:27017" --db=OSeM-api --collection=location --type=csv --fields="deviceId,timestamp,longitude,latitude" --out="/exports/location.csv"
echo "Export finished"
