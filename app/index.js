var Sequelize = require('sequelize');
const express = require('express');
const tmi = require("tmi.js");
const app = express();

// default user list
var twitchUsers = [
      "ureka2020"
      //"urekaTester"
    ];

var TwitchUser;

// setup a new database
// using database credentials set in .env
var sequelize = new Sequelize('database', process.env.DB_USER, process.env.DB_PASS, {
  host: '0.0.0.0',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
    // Security note: the database is saved to the file `database.sqlite` on the local filesystem. It's deliberately placed in the `.data` directory
    // which doesn't get copied if someone remixes the project.
  storage: '.data/database.sqlite'
});

// authenticate with the database
sequelize.authenticate()
  .then(function(err) {
    //console.log('Connection has been established successfully.');
    // define a new table 'users'
    TwitchUser = sequelize.define('users', {
      twitchName: {
        type: Sequelize.STRING
      }
    });
    
    setup();
  })
  .catch(function (err) {
    console.log('Unable to connect to the database: ', err);
  });

// populate table with default users
function setup()
{
  TwitchUser.sync({force: true}) // We use 'force: true' in this example to drop the table users if it already exists, and create a new one. You'll most likely want to remove this setting in your own apps
    .then(function()
    {
      // Add the default users to the database
      for (var i=0; i < twitchUsers.length; i++)
      { // loop through all default users
        TwitchUser.create({ twitchName: twitchUsers[i] }); // create a new entry in the users table
      }
    });  
}

// Glitch expects a web server so we're starting express to take care of that.
// The page shows the same information as the readme and includes the remix button.
app.use(express.static('public'));

app.get("/", function (request, response) 
{
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/users", function (request, response) 
{
  var dbUsers=[];
  TwitchUser.findAll().then(function(users) 
  { // find all entries in the users tables
    users.forEach(function(user) 
    {
      dbUsers.push([user.twitchName]); // adds their info to the dbUsers value
    });
    response.send(dbUsers); // sends dbUsers back to the page
  });
});

// creates a new entry in the users table with the submitted values
app.post("/users", function (request, response) 
{
  var create_it = false;
  var BreakException = {};
  
  TwitchUser.findAll().then(function(users) 
  { // find all entries in the users tables
    try
    {
      create_it = true;
      users.forEach(function(user) 
      {
        console.log("user.twitchName = "+user.twitchName+", query name: "+request.query.userName);
        if (user.twitchName == request.query.userName)
        {
          console.log("!! FOUND !!");
          create_it = false;
          throw BreakException;
        }
      });
    } catch (e)
    {
      if (e !== BreakException) 
        throw e;
    }
    
    console.log("create_it is: "+create_it);
    if (create_it == true)
    {
      console.log("---- CREATING SOMETHING?? request.query.userName is "+request.query.userName);
      if (joinChannel(request.query.userName))      // Join Twitch channel
      {
        TwitchUser.create({ twitchName: request.query.userName });
        response.sendStatus(200);
      }
    }
    else
    {
      console.log("already exists: "+request.query.userName);
    }
  });
});

function joinChannel(name)
{
  try
  {
    client.join(name);      // Join Twitch channel
  } catch (e)
  {
    console.log("Unable to add user to Twitch: "+e);
    return false;
  }
  
  return true;
}

// drops the table users if it already exists, populates new users table it with just the default users.
app.get("/reset", function (request, response) 
{
  setup();
  response.redirect("/");
});

// removes all entries from the users table
app.get("/clear", function (request, response) 
{
  TwitchUser.destroy({where: {}});
  response.redirect("/");
});


/*
app.post('/', function(req, res, next) {
 // Handle the post for this route
});
*/

let listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

// Setting options for our bot, disable debug output once your up and running.
let options = {
  options: {
    debug: true
  },
  connection: {
    cluster: "aws",
    reconnect: true
  },
  identity: {
    username: process.env.USERNAME,
    password: process.env.PASSWORD
  },
  channels: []//["ureka2020", "urekaTester"]
};

// Set up our new TMI client and connect to the server.
let client =  new tmi.client(options);
client.connect();

// We have debug enabled now but if not we want some sort of confirmation
// we've connected to the server.
client.on('connected', (address, port) => {
  console.log(`Connected to ${address}:${port}`);
})

var current_price = "0";
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

function preload(channel, coin)
{
  var request = new XMLHttpRequest();
  
  // Create a request variable and assign a new XMLHttpRequest object to it.
  request.onreadystatechange = function() 
  {
    if (this.readyState == 4 && this.status == 200) 
    {
      // Begin accessing JSON data here
      var data = JSON.parse(request.responseText);
      var price;

      if (data.priceInUSD != null) 
      {
        price = data.priceInUSD;
      }
      
      current_price = price;
      if (current_price)
      {
        client.action(channel, "Current "+coin+" price is "+current_price + " USD");
      }
      else
      {
        client.action(channel, "Invalid coin, please check the name and/or spelling and try again.");
      }
    }
  };

  // Open a new connection, using the GET request on the URL endpoint
  request.open(
    "GET",
    "https://api.rally.io/v1/creator_coins/" + coin + "/price",
    false
  );
  request.send();
}

// Whisper the response
function getBalance(channel, userid)
{
  var request = new XMLHttpRequest();
  
  // Create a request variable and assign a new XMLHttpRequest object to it.
  request.onreadystatechange = function() 
  {
    if (this.readyState == 4 && this.status == 200) 
    {
      // Begin accessing JSON data here
      var coindata;
      var data = JSON.parse(request.responseText);
      var info = "";
      if (data)
      {
        for (coindata in data)
        {
          info = info + data[coindata]["coinKind"]+": balance = "+data[coindata]["coinBalance"]+" with estimated USD value of: "+data[coindata]["estimatedInUsd"]+" USD";
          client.whisper(channel, "!creatorcoin_bot "+info);
        }
      }
      else
      {
        info = "Unable to retrieve data. Please try again later.";
        client.whisper(channel, "!creatorcoin_bot "+info);
      }
    }
  };

  // Open a new connection, using the GET request on the URL endpoint
  request.open(
    "GET",
    "https://api.rally.io/v1/users/rally/" + userid + "/balance",
    false
  );
  request.send();
}

// This simple bot will simply monitor chat logging for instances of '!twitter' or '!github'.
// 
/*
client.on('whisper', (user, message, self) => {
    //if (user['display-name'] !== "ureka2020") 
    {
        this.handleMessage(null, user, message, self, true)
    }
})
*/

client.on('join', (channel, username, self) => {
  if(self) 
  {
    client.action(channel, 'Joined.')
        .catch(err => console.log(err));
  }
});

client.on('chat', (channel, tags, message, self) => {
  console.log("channel is "+channel);
  switch(message) 
  {
    case '!twitter': 
      client.action(channel, `${tags['display-name']} you can find it at twitter.com/ureka!`);
      break;
      
    case "!help":
      client.whisper(`${tags['display-name']}`, `@${tags.username}, you are interesting`);
      break;
      
    default:
      break;
  }

  if (message.startsWith("!bal")) 
  {
      var input = message.split(" ");
      if (input.length == 2)
      {
        var userid = input[1];
        client.action(channel, "Please wait..fetching balance for "+userid);
        getBalance(channel, userid);
      }
      else
      {
        client.action(channel, "Please provide a valid user id.");
      }
  }
  else if (message.startsWith("!coin")) 
  {
      var input = message.split(" ");
      if (input.length == 2)
      {
        var coin_name = input[1];
        client.action(channel, "Please wait..fetching price for "+coin_name);
        preload(channel, coin_name);
      }
      else
      {
        client.action(channel, "Please provide a coin name. Eg. !cc <name>");
      }
  }
  else if (message.startsWith("!pm")) 
  {
    //client.color('red');
    var input = message.split(" ");
    if (input.length >= 2) 
    {
      console.log("display name: "+tags['display-name']);
      if (tags['display-name'] === "creatorcoin_bot") 
      {
          client.action(channel, "!" + input[1] + " this is a test");

      } else {
          client.say(channel, "No permissions");
      }
    }
  }
})

