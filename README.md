# openSenseMap Archive

This repository contains the scripts to generate the `csv` & `json` files for the [openSenseMap Archive](https://archive.opensensemap.org).

## Getting started

This is a Node.js project.

### Prerequisities

You will need to have Node.js (at least >= 18) and npm or yarn installed. Also you need Docker and Docker Compose installed.

### Installation

1. Clone the repository

```bash
git clone git@github.com:sensebox/openSenseMap-archive.git
```

2. Install NPM packages

```bash
npm install
```

3. Create the `.env` file

```bash
cp .env.example .env
```

4. Enter der environmental variables in `.env`

5. Spin up the local database

```bash
docker-compose up -d db
```

> To seed the database with boxes and measurements, copy the archive files created by `mongodump` to the `dumps` folder. The *boxes* dump should be named **boxes** and the *measurement* dump should be named **measurements**
> The folder is mounted to the MongoDB container and will seed the data on start up.

6. Run the archiver (locally)

```bash
npm run create-archive
```

7. Run the archiver (Docker)

```bash
docker build -t osem-archiver .
docker-compose up -d
```

> For this option skip point 5 and just copy the dumps as explained.

The archive files should be generated by default inside the `archive` folder.

## Scripts

### mongodb

Contains scripts to initialize the used MongoDB database for development purposes. Are just used within the `docker-compose.yml` file and mounted to the `db` service.

### systemd

Contains `systemd` service and timer files to run the archiver as a systemd service. The `archive-checker.service` uses the `check-container.sh` utility.

### utilities

Containes two utility scripts to check container status and wait for specific services on a tcp host/port.

- `wait-for-it.sh`: is used within the the Docker image [https://github.com/vishnubob/wait-for-it](https://github.com/vishnubob/wait-for-it)
- `check-container.sh`: checks if the archiver is running and is used in the systemd service
