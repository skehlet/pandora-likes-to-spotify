#!/usr/bin/env node

var SpotifyWebApi = require('spotify-web-api-node');


// var spotifyApi = new SpotifyWebApi({
//   clientId : 'fcecfc72172e4cd267473117a17cbd4d',
//   clientSecret : 'a6338157c9bb5ac9c71924cb2940e1a7',
//   redirectUri : 'http://www.example.com/callback'
// });


var spotifyApi = new SpotifyWebApi();

// Get multiple albums
spotifyApi.getAlbums(['5U4W9E5WsYb2jUQWePT8Xm', '3KyVcddATClQKIdtaap4bV'])
  .then(function(data) {
    console.log('Albums information', data.body);
  }, function(err) {
    console.error(err);
  });
