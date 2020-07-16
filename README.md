# NeighborGood

Capstone project for STEP pod 46 in 2020.

This is not an official Google product.

## Configuration

A config file `/src/main/webapp/config.js` including a Google Maps API key should be included. This file should follow the below template:

```
var config = {
    MAPS_KEY: 'your-google-maps-api-key'
};
```

If you want to run the site locally without HTTPS and at a non-localhost URL,
you can also add in a `LOCAL_DEV_LAT_LNG` item to hard-code your location to
some latitude and longitude:

```
var config = {
    ...
    LOCAL_DEV_LAT_LNG: {lat: 12.345, lng: 67.890}
    ...
}
```
## Testing

All servlet unit tests can be run using the command `mvn test`

In order to run the IntegrationTest you must have Google Chrome installed and it must be accessible from where you are running the IntegrationTest.
To run the IntegrationTest first start the devServer with the command `mvn package appengine:start` and once the devServer is running use the command `mvn -Dtest=IntegrationTest test`.
Once you are done testing, stop the devServer with command `mvn package appengine:stop`

