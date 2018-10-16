# FLS

## Install
### RethinkDB
```sh
source /etc/lsb-release && echo "deb http://download.rethinkdb.com/apt $DISTRIB_CODENAME main" | sudo tee /etc/apt/sources.list.d/rethinkdb.list
wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install rethinkdb
```
### nvm
```sh
sudo apt-get update
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
nvm install node
nvm use node
```
### high-end installs
- `sudo apt-get install sendmail` (unless SMTP configuration is provided)
- `sudo apt-get install npm`
- `npm install gulp-cli -g` (unless `which gulp` OK)

## Deploy:
- `npm install`
- retrieve `/private` & `/public/assets`
- `npm run db` (Ctrl-C to close DB instance)
- `npm run setup-db`
- `gulp` (pug & CSS)
- `npm run server`
- make a one-call deployment script... someday

