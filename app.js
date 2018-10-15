const GameLogic = require("./gameLogic.js");
const Utils = require("./utils.js");

// Twitter conf
const Twit          = require("twit");
const Config        = require("./config.js");
const T = new Twit({
  consumer_key:         Config.twitter.auth.consumer_key,
  consumer_secret:      Config.twitter.auth.consumer_secret,
  access_token:         Config.twitter.auth.access_token_key,
  access_token_secret:  Config.twitter.auth.access_token_secret,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            false,     // optional - requires SSL certificates to be valid.
});

Utils.Initialize(T, Config, function(T, Config) {
  GameLogic.Start(T, Config);
});