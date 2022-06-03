# XD Testing - Configurator
## Quick Start
### Prerequisites
- A GitHub account
- [Docker](https://www.docker.com/products/docker-desktop/)

If you wish to contribute:
- PHP >= 8 ([Windows](https://windows.php.net/download), [Mac](https://formulae.brew.sh/formula/php), [*nix](https://www.php.net/manual/en/install.unix.debian.php))
- [NodeJS + npm](https://nodejs.org)

### Steps
1. Create a new OAuth application on your GitHub account as described [here](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app). In `Authorization callback URL` make sure to insert `http://localhost:8080/auth`

#### Run the application
2. Open [`server/.env.example`](./server/.env.example) and edit the fields `CLIENT_ID` and `CLIENT_SECRET` with the information provided by the just created GitHub OAuth application. **DO NOT COMMIT THE CHANGES TO THE FILE, KEEP IT ONLY LOCALLY BECAUSE IT CONTAINS SENSITIVE DATA**
3. Open a terminal on the main folder (i.e.: the ones that contains `Dockerfile`) and issue the following command:
   ```shell
   docker build . -t xd-configurator
   ```
   It will build the application as a Docker image

4. Run the application by running the following in the same terminal:
   ```shell
   docker run -d -p 8080:80 --name xd-configurator xd-configurator
   ```
   It will bind the internal container's port 80 to your machine's port 8080

5. Navigate to [http://localhost:8080](http://localhost:8080)

#### Contribute
2. Install dependencies: open a terminal, `cd` into `configurator` and run
   ```shell
   npm install
   ```

3. Open a terminal, `cd` into `server` and run the following:
   ```
   docker build . -t xd-server
   ```
   This will build the server image of the application

4. Run the server by issuing the following into a terminal:
   ```
   docker run -d -p 8080:80 --name xd-server xd-server
   ```
   This will create a new container called `xd-server` which will have its internal port 80 binded to the port 8080 of your machine

5. Open a shell in the just started container by issuing the following into a terminal:
   ```shell
   docker exec -it xd-server bash
   ```
   The shell will open on `/var/www/html` that's where all the server's files are located. Edit `.env` in the following way:
   - Leave blank the field `ROUTES_PREFIX` and add `ENV=development`; the file should look like the following:
      ```dotenv
      ENV=development
      ROUTES_PREFIX=
      # other variables
      ```
   - edit the fields `CLIENT_ID` and `CLIENT_SECRET` with the information provided by the just created GitHub OAuth application

7. Exit from container's terminal, `cd` into `configurator` and start the frontend by running the following:
   ```
   npm start
   ```

8. Navigate to [http://localhost:4200](http://localhost:4200)
