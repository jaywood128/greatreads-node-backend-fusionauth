const express = require('express');
var app = express();

const { v4: uuidv4 } = require('uuid');


const path = require('path');
const router = express.Router();
var bodyParser = require('body-parser')
//https://expressjs.com/en/resources/middleware/body-parser.html#expressconnect-top-level-generic

var session = require('express-session');

var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');
// parse application/json
app.use(bodyParser.json());

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

require('dotenv').config()

//Swagger 
// https://swagger.io/docs/specification/about/
//https://blog.logrocket.com/documenting-your-express-api-with-swagger/

const swaggerOptions = { 
  swaggerDefinition: {
      info: {
          title: 'GreatReads API',
          version: '1.0.0',
          description: 'This is a simple CRUD application for managing books using Express, graphQL and documented with Swagger'
      }
  },
  apis: ['index.js']
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));


var books = [
  {id: 1, title: "Homegoing", author: "Ya Gyasi", rating : 4.47, description: "A novel of breathtaking sweep and emotional power that traces three hundred years in Ghana and along the way also becomes a truly great American novel. Extraordinary for its exquisite language, its implacable sorrow, its soaring beauty, and for its monumental portrait of the forces that shape families and nations, Homegoing heralds the arrival of a major new voice in contemporary fiction.", finished: true},
  {id: 2, title: "Golden Son", author: "Pierce brown", rating: 4.44, description: "As a Red, Darrow grew up working the mines deep beneath the surface of Mars, enduring backbreaking labor while dreaming of the better future he was building for his descendants.", finished: true},
  {id: 3, title: "On the Shortness of Life" , author: "Seneca", rating: 4.12 , description: "The Stoic writings of the philosopher Seneca offer powerful insights into the art of living, the importance of reason and morality, and continue to provide profound guidance to many through their eloquence, lucidity and timeless wisdom",finished: false},
  
]

const { FusionAuthClient } = require('fusionauth-node-client');

const client = new FusionAuthClient(
  // API Key
  `${process.env.API_KEY}`,
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
// To find the secret, navigate to in the Admin Dashboard Settings > Key Master > Default signing key > View > Reveal Secret
app.use(session({
  secret: `${process.env.SECRET}`,
  resave: false,
  saveUninitialized: true
}));

app.get('/', function(req, res) {
  res.send('Welcome to GreatReads!');
});

// Places where $ref can be used: https://swagger.io/docs/specification/using-ref/


/**
* @swagger
* /register:
*   post:
*     description: Register for GreatReads
*     requestBody:
*       description: Register a user
*       required: true
*       content:
*         application/json:
*          schema:
*            $ref: '#/components/schemas/UserRegistration'
*     responses:
*       201:
*         description: Created
*            
*/
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


app.get('/logout', function(req, res) {
  req.session.destroy()
  res.send("Successfully logged out");
});

/**
* @swagger
* /login:
*   post:
*     description: Login to GoodReads
*     requestBody:
*        description: Register a user
*        required: true
*        content:
*          application/json:
*            schema:
*              $ref: '#/components/schemas/UserLogin'
*     responses:
*       201:
*         description: Created
*    
*/
app.post('/login', function(req, res) {
  console.log(process.env) 

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
              console.log(clientResponse.successResponse.token)
              res.redirect('/bookshelf');
          })
          .catch(function(error) {
              console.log("ERROR: ", JSON.stringify(error, null, 8))
              res.send("Login failure");
          });

  }
});


// Attempt to view this page before logging in

/**
* @swagger
* /bookshelf:
*   get:
*     description: Get all books
*     responses:
*       200:
*         description: Success
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ArrayOfBooks'
*/

app.get('/bookshelf', function(req, res) {
  if (!req.session.user) {
      res.send("Login required");
      // Route to self hosted Login page
  } else {
      res.send(books);
  }
});

/**
 * @swagger
 * /bookshelf:
 *  post:
 *    description: Add a great read to your bookshelf.
 *    requestBody:
 *      description: Request body for a book added to your GreatReads bookshelf.
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Book'
 *    responses:
 *      200:
 *        description: Successfully added.
 */
//Validate req.body https://express-validator.github.io/docs/
app.post('/bookshelf', function(req, res){
  // Ensure a user has a session
  if (!req.session.user) {
    res.send("Login required");
    // Route to self hosted Login page
} else {
  // In a FullStack app, Mongo would generate a unique id for us:https://www.mongodb.com/blog/post/generating-globally-unique-identifiers-for-use-with-mongodb
  // https://github.com/uuidjs/uuid
 books.forEach( book => {
  console.log("request title" + req.body.title)
  if(book.title === req.body.title){
    console.log("Books already added")
  } else {
    const book = { 
      id: uuidv4(), 
      title: req.body.title,
      author: req.body.author,
      rating: req.body.rating,
      description: req.body.description, 
      finished: req.body.finished
    }
      books.push(book)
      res.send(books);
  }
 })

}



})


/**
 * @swagger
 * /bookshelf:
 *  delete:
 *    description: Remove a great read from your bookshelf.
 *    responses:
 *      204:
 *        description: The books was removed from your bookshelf.
 *      
 */
// Todo - book not getting deleted

app.delete('/bookshelf/:bookId', (req, res)=> {
  if(!req.session.user){
    console.log("Login required!")
  }else {
    console.log("req params", req.params.bookId)
    const bookIndex = books.findIndex(({ book }) => book.id === req.params.bookId);
    console.log("Book index" + bookIndex)
    if (bookIndex >= 0) {
      console.log("Removing book with id " + bookId)
      books.splice(bookIndex, 1);
    }
    res.send(books)

  }

}
)


app.listen(3000, function() {
  console.log('GreatReads app listening on port 3000!');
});

// Construct a schema, using GraphQL schema language
// var schema = buildSchema(`
//   type Query {
//     hello: String
//   }
// `);

// The root provides a resolver function for each API endpoint
// var root = {
//   hello: () => {
//     return 'Hello world!';
//   },
// };


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
  book : (arg)=> books.find((book) => book.id === arg.id)
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





