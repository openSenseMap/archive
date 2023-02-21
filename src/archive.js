import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config({ path: ".env" });

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import ObjectsToCsv from "objects-to-csv";
import { notifyMattermost } from "./utils/notification.js";

// Connection URL
const url = `mongodb://${process.env.MONGO_HOST}:27017/${process.env.MONGO_DB}`;
const client = new MongoClient(url);

const ARCHIVE_BASE_FOLDER = process.env.ARCHIVE_BASE_FOLDER || "./archive";
const INDEX_DATE =
  process.env.INDEX_DATE || dayjs(new Date()).subtract(1, "day");
const date = dayjs(INDEX_DATE).format("YYYY-MM-DD");

async function main() {
  if (!existsSync(`${ARCHIVE_BASE_FOLDER}/${date}`)) {
    await mkdir(`${ARCHIVE_BASE_FOLDER}/${date}`);
    console.log(`Created folder: ${ARCHIVE_BASE_FOLDER}/${date}`);
  }

  await client.connect();
  console.log("Connected successfully to server");
  const db = client.db(process.env.MONGO_DB);
  const boxes = db.collection("boxes");
  const measurements = db.collection("measurements");

  const deviceProjection = {
    _id: 0,
    id: "$_id",
    sensors: 1,
    name: 1,
    exposure: 1,
    model: 1,
    loc: 1,
  };

  console.time(`Archive date: ${date}`);
  const boxesCursor = boxes.find({}).project(deviceProjection);

  for await (const box of boxesCursor) {
    const boxName = box.name.replace(/[^A-Za-z0-9._-]/g, "_");
    const folderNameAndPath = `${ARCHIVE_BASE_FOLDER}/${date}/${box.id}-${boxName}/${boxName}-${date}.json`;
    let boxHasData = false;
    const dailyStats = new Map();

    for await (const sensor of box.sensors) {
      // console.time(`Getting measurements for sensor: ${sensor._id}`);

      // Use aggregation to get measurements
      const pipeline = [
        { $match: { sensor_id: sensor._id } },
        {
          $project: {
            _id: 0,
            createdAt: {
              $dateToString: {
                date: "$createdAt",
              },
            },
            value: 1,
          },
        },
        { $sort: { createdAt: 1 } },
        {
          $replaceRoot: {
            newRoot: {
              createdAt: "$createdAt",
              value: "$value",
            },
          },
        },
      ];

      const daily = [
        { $match: { sensor_id: sensor._id } },
        {
          $group: {
            _id: "$sensor_id",
            avg: {
              $avg: {
                $toDouble: {
                  $trim: { input: "$value" },
                },
              },
            },
            min: {
              $min: {
                $toDouble: {
                  $trim: { input: "$value" },
                },
              },
            },
            max: {
              $max: {
                $toDouble: {
                  $trim: { input: "$value" },
                },
              },
            },
            count: {
              $count: {},
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              avg: "$avg",
              min: "$min",
              max: "$max",
              count: "$count",
            },
          },
        },
      ];

      // Get measurements for a sensor
      const values = await measurements.aggregate(pipeline).toArray();

      const dailyValues = await measurements.aggregate(daily).toArray();
      dailyStats.set(sensor._id, dailyValues);

      if (values.length === 0) {
        // console.log(
        //   `No measurements found for device: ${box.id} & sensor: ${sensor._id}`
        // );
      } else {
        // Just create Box folder and box JSON file if we have at least one sensor with data
        boxHasData = true;
        if (
          !existsSync(`${ARCHIVE_BASE_FOLDER}/${date}/${box.id}-${boxName}`)
        ) {
          await mkdir(`${ARCHIVE_BASE_FOLDER}/${date}/${box.id}-${boxName}`);
          console.log(
            `Created folder: ${ARCHIVE_BASE_FOLDER}/${date}/${box.id}-${boxName}`
          );
        }

        try {
          // Convert measurements to csv
          const csv = new ObjectsToCsv(values);

          // Save to file:
          await csv.toDisk(
            `${ARCHIVE_BASE_FOLDER}/${date}/${box.id}-${boxName}/${sensor._id}-${date}.csv`
          );
        } catch (error) {
          console.error(
            `Save CSV to disk failed for box: ${box.id} and sensor: ${sensor._id}`,
            error
          );
        }
      }
    }

    if (boxHasData) {
      if (!existsSync(folderNameAndPath)) {
        try {
          box.sensors.map((sensor) => {
            const stats = dailyStats.get(sensor._id);
            if (stats.length === 1) {
              sensor["avg"] = stats[0].avg;
              sensor["min"] = stats[0].min;
              sensor["max"] = stats[0].max;
              sensor["count"] = stats[0].count;
            }
          });

          let data = JSON.stringify(box);
          await writeFile(folderNameAndPath, data);
        } catch (error) {
          console.error(`Save JSON to disk failed for box: ${box.id}`, error);
        }
      }
    }
  }

  // Close all cursor
  await boxesCursor.close();

  console.timeEnd(`Archive date: ${date}`);

  return "done.";
}

main()
  .then((response) => {
    console.log(response);
    notifyMattermost(INDEX_DATE);
  })
  .catch((error) => {
    console.error(error);
    notifyMattermost(INDEX_DATE, error);
  })
  .finally(() => client.close());
