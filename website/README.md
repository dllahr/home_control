# Architecture

1. router forwards from port 8080 to 80 on the raspberry pi
1. nginx listens on port 80, forwards url locations starting with homeControl to port 8124 on localhost
    * (configuration in /etc/nginx/sites-enabled/default)
1. node server listens on port 8124
    * get requests:  return latest / recent data
        * called from browser that has downloaded website index.html
    * put requests:  save new data in the database
        * called from electric imp agents

# Developing / Tests

* trying it out
    * run:  node server.js
    * navigate to localhost:8124
    * should see basic page with minimal data
* server-side
    * node test_database.js
    * node test_database.js testGetDeviceMetadata
* client side
    * browse to localhost:8124/test_home_control.html
        * view output in console
