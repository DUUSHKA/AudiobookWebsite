//comments added for better code readability
// install all necesseary dependencies below using npm install
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const ejs = require('ejs');
const MySQLStore = require('express-mysql-session')(session);
const fs = require('fs');

let userID;
let userName;
out = [];
// create an instance of the express application
const app = express();

// set up the middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'mysecretkey',
  resave: true,
  saveUninitialized: true
}));

// create a connection to the MySQL database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'SWEPRoj2023',
  database: 'RUListening'
});
const sessionStore = new MySQLStore({
    expiration: 86400000,
    createDatabaseTable: true,
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data'
      }
    }
  }, connection);
  

// connect to the MySQL database
connection.connect();


// set up the routes
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

//full login setup
app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const isPublisher = req.body.isPublisher;
  const isPublisherChecked = isPublisher ? 1 : 0; //asks if they are a publisher

  connection.query('SELECT * FROM accounts WHERE username = ?', [username], (error, results, fields) => {
    if (results.length > 0) {
      out = results;
      const hashedPassword = results[0].password;
     userID = results[0].id; // store the userID in the session
     fs.writeFile('userID.txt', `${userID}`, (err) => {
      if (err) throw err;
      console.log('User ID saved to file'); //successfully writted the userID to a file for use elsewhere
    });
    const isPublisher = results[0].isPublisher; // asks if they are a publisher
      bcrypt.compare(password, hashedPassword, (err, result) => { //compares hashed password using bcrypt hashing function
        if (result) {
          req.session.loggedin = true;
          req.session.username = username;
          if(isPublisher==1){
            res.redirect('http://localhost:8081/publisher');
          }
          else{
            res.redirect('http://localhost:8081/');
          }  
        } else {
          res.send({"obj":'Incorrect username and/or password!'});        }
        res.end();
      });
    } else {
      res.send({"obj":'Incorrect username and/or password!'});
      res.end();
    }
  });
});

app.get('/register', (req, res) => { //get method to redirect user to register
  res.sendFile(__dirname + '/register.html');
}); 



app.post('/register', (req, res) => { //post method for putting registration in backend
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const isPublisher = req.body.isPublisher;
  const isPublisherChecked = isPublisher ? 1 : 0; //checkbox to see if they are publsiher

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    connection.query('INSERT INTO accounts (username, email, password, isPublisher) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, isPublisherChecked], (error, results, fields) => { //mySQL query to put registration in the backend
      if (error) {
        console.log(error);
        res.send('An error occurred while registering.');
      } else {
        req.session.loggedin = true;
        req.session.username = username;
        userName = req.session.username;
        res.redirect('http://localhost:3000/login'); //if there are no errors, redirect user to login page

      }
      res.end();
    });
  });
});

app.get('http://localhost:8081', (req, res) => {
  if (req.session.loggedin) {
    res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
  } else {
    res.redirect('/login');
  }
});


app.post('/logout', (req, res) => { //post method to hold log out info
  req.session.loggedin = false;
  //delete sessiosn table when user logs out
  connection.query("DROP TABLE sessions");

  //delete file holding userID when logged out
  fs.unlink('userID.txt', (err) =>{
    if (err) {
      console.error(err);
      return;
    }
  
    console.log('File has been deleted');
  });

  res.redirect('/login');
});
// start the server running on port 3000: 'node authorization.js' in terminal (make sure SQL table is set up as described)
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
