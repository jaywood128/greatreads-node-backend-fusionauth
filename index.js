const express = require('express');
const path = require('path');
const router = express.Router();
var bodyParser = require('body-parser')
//https://expressjs.com/en/resources/middleware/body-parser.html#expressconnect-top-level-generic
var session = require('express-session');

var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');

var app = express();
// parse application/json
app.use(bodyParser.json());

const { FusionAuthClient } = require('fusionauth-node-client');

const client = new FusionAuthClient(
  // API Key
  '',
  'http://localhost:9011'
);

// This represents the applicaiton we are logging into `GreatReads` application

const applicationId = '663d4d90-6b12-42ea-adc3-d89cfe45968a';
const data = {
    user: null,
    token: null
};
// This will be mounted ever time our middleware receives a request that takes no path
// The 'secret' is used to verify the JSON Web Token
// To find the secret, navigate to Settings > Key Master > Default signing key > View > Reveal Secret
app.use(session({
  secret: '',
  resave: false,
  saveUninitialized: true
}));

app.get('/', function(req, res) {
  res.send('Hello World!');
});

app.get('/logout', function(req, res) {
  req.session.destroy()
  res.send("Successfully logged out");
});

app.post('/login', function(req, res) {
  console.log(req.body)
  if (req.session.user) {
      console.log('user: ', req.session.user);
      res.send("We already have a user");
  } else {
      const obj = {
          'loginId': req.body.user,
          'password': req.body.password,
          'applicationId': applicationId
      };
      // This returns a Promise object, just like fetch or axios
      client.login(obj)
          .then(function(clientResponse) {
              req.session.user = clientResponse.successResponse.user;
              req.session.token = clientResponse.successResponse.token;
              // This should log our `token` and `user`
              // Decode it here: https://jwt.io/
              //In a real world application, we would use JSON Web Tokens on every route where we needed to verify a user (and/or their roles), 
              // verify the signatures on those tokens, and take appropriate action if the token has expired (such as redirecting the user to the /login handler).
              console.log(JSON.stringify(clientResponse.successResponse, null, 8))
              res.redirect('/bookshelf');
          })
          .catch(function(error) {
              console.log("ERROR: ", JSON.stringify(error, null, 8))
              res.send("Login failure");
          });

  }
});
// Attempt to view this page before logging in

app.get('/bookshelf', function(req, res) {
  if (!req.session.user) {
      res.send("Login required");
      // Route to self hosted Login page
  } else {
      res.send("Book shelf");
  }
});

app.post('/register', function(req, res){
  client.register(null, req.body)
      .then(function(clientResponse) {
          res.send(clientResponse);
      })
      .catch(function(error) {
          console.log("ERROR: ", JSON.stringify(error, null, 8))
          res.send(error);
      });
});


app.listen(3000, function() {
  console.log('FusionAuth example app listening on port 3000!');
});

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Query {
    hello: String
  }
`);

// The root provides a resolver function for each API endpoint
var root = {
  hello: () => {
    return 'Hello world!';
  },
};

var books = [
  {id: 1, title: "Homegoing", author: "Ya Gyasi", rating : 4.47, description: "A novel of breathtaking sweep and emotional power that traces three hundred years in Ghana and along the way also becomes a truly great American novel. Extraordinary for its exquisite language, its implacable sorrow, its soaring beauty, and for its monumental portrait of the forces that shape families and nations, Homegoing heralds the arrival of a major new voice in contemporary fiction."},
  {id: 2, title: "Golden Son", author: "Pierce brown", rating: 4.44, description: "As a Red, Darrow grew up working the mines deep beneath the surface of Mars, enduring backbreaking labor while dreaming of the better future he was building for his descendants."},
  {id: 3, title: "On the Shortness of Life" , author: "Seneca", rating: 4.12 , description: "The Stoic writings of the philosopher Seneca offer powerful insights into the art of living, the importance of reason and morality, and continue to provide profound guidance to many through their eloquence, lucidity and timeless wisdom"}
]


// Construct a schema, using GraphQL schema language

var schema = buildSchema(`
  type Query {
    book(id: Int): Book,
    books: [Book]
  },
type Book {
  id: Int,
  title: String,
  author: String,
  rating: Float,
  description: String
}
`);

var root = {
  book : (arg)=>books[arg.id]
  // books : ()=> restaurants,
  // addBook : ({input}) => {
  //   books.push({title:input.title,rating:input.rating,description:input.description})
  //   return input
  // }
  // deleterestaurant : ({id})=>{
  //   const ok = Boolean(restaurants[id])
  //   let delc = restaurants[id];
  //   restaurants = restaurants.filter(item => item.id !== id)
  //   console.log(JSON.stringify(delc)) 
  //   return {ok}
  // },
  // editrestaurant: ({id, ...restaurant}) => {
  //   if(!restaurants[id]) {
  //     throw new Error("restaurant doesn't exist")
  //   }
  //   restaurants[id] = {
  //   ...restaurants[id],...restaurant
  //   }
  //   return restaurants[id]
  // }
}

// To use the GraphQL graphical interface, navigate to http://localhost:4000/graphql

var app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));
app.listen(4000);
console.log('Running a GraphQL API server at http://localhost:4000/graphql');
