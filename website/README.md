# Architecture

1. router forwards from port 8080 to 80 on the raspberry pi
1. nginx listens on port 80, forwards url locations starting with homeControl to port 8124 on localhost
    * (configuration in /etc/nginx/sites-enabled/default)
1. node server listens on port 8124
    * get requests:  return latest / recent data
        * called from browser that has downloaded website index.html
    * put requests:  save new data in the database
        * called from electric imp agents

# Dependencies

* sudo apt-get install nginx nodejs npm
* npm install sqlite3
    * sqlite3@4.0.2
    * had to download & compile on the raspberry pi (no default ARM package?)
* npm install nodemailer
* npm install config

