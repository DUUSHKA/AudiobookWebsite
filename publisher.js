const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const app = express();

const db = mysql.createConnection({
  host: "localhost",
    user: "root",
    password: "SWEPRoj2023",
    database: 'RUListening'
});

//create session store
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
}, db);

//connect to MySQL 
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to MySQL Database');
});

app.set('view engine', 'ejs');

//use middleware --> used to check if user is logged in and is a publisher
app.use(session({
  secret: 'mysecret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false
}));

const isPublisher = (req, res, next) => {
  //if user is not logged in 
  if (!req.session.UserID) {
    res.redirect('/login');
  } else {
//check if user is publisher 
    const query = `SELECT * FROM Users WHERE UserID=${req.session.UserID}`;
    db.query(query, (err, results) => {
      if (err) {
        throw err;
      }
      if (results.length > 0 && results[0].AccountType === 'publisher') {
        next();
      } else {
        //user is not a publisher
        res.redirect('/');
      }
    });
  }
};

//render login page
app.get('/login', (req, res) => {
  res.render('login');
});

//handle login
app.post('/login', (req, res) => {
  let body = '';

  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const email = body.split('=')[1].split('&')[0];
    const password = body.split('=')[2];

   
    const query = `SELECT * FROM Users WHERE UserEmail='${email}' AND Password='${password}'`;
    db.query(query, (err, results) => {
      if (err) {
        throw err;
      }

      if (results.length > 0) {
        //create session for user 
        req.session.UserID = results[0].UserID;
        res.redirect('/');
      } else {
        res.redirect('/login');
      }
    });
  });
});

//get catalog page
app.get('/', (req, res) => {
  if (!req.session.UserID) {
    res.redirect('/login');
  } else {
    const query = 'SELECT * FROM Catalog';
    db.query(query, (err, results) => {
      if (err) {
        throw err;
      }
      res.render('catalog', { books: results });
    });
  }
});

//render publisher book form page
//render Add Book Page for Publishers Only
app.get('/add', (req, res) => {
    if (!req.session.UserID || req.session.UserType !== 'publisher') {
      res.redirect('/login');
    } else {
    //create add book form
      res.render('add', { title_label: 'Title:', author_label: 'Author:', description_label: 'Description:' });
    }
  });
  
//handle form submission
app.post('/add', (req, res) => {
  //get form data from request body
  const { newTitle, newAuthor, newGenre, newSummary } = req.body;
  //insert book data into database 
  const sql = 'INSERT INTO audiobooks.dummy (title, author, genre, summary) VALUES (newTitle, newAuthor, newGenre, newSummary)';

//execute SAT query using connection pool 
  pool.query(sql, [newTitle, newAuthor, newGenre, newSummary], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error adding book');
    } else {
      res.send('Book added successfully');
    }
  });
});