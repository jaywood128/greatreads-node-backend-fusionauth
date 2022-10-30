const {FusionAuthClient} = require('fusionauth-node-client');
const client = new FusionAuthClient(
    '',
    'http://localhost:9011'
);

// Retrieve User by Email Address
client.retrieveUserByEmail('jaywood128@gmail.com')
       .then(handleResponse);

function handleResponse (clientResponse) {
  console.info(JSON.stringify(
    clientResponse.successResponse.user, null, 2)
  );
}
