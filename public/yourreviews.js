const express = require('express');
const mysql = require('mysql');

const app = express();
const port = 8081;

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'username',
  password: 'password',
  database: 'databasename'
});

app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));

app.get('/yourreviews', (req, res) => {
  const sql = 'SELECT BookTitle, review FROM Reviews INNER JOIN Catalog ON Reviews.BookID = Catalog.BookID;';
  connection.query(sql, (err, results) => {
    if (err) throw err;
    res.render('yourreviews', { reviews: results });
  });
});

app.delete('/review', (req, res) => {
  const sql = `DELETE FROM Reviews WHERE BookID = '${req.body.BookID}' AND review = '${req.body.review}'`;
  connection.query(sql, (err, results) => {
    if (err) throw err;
    res.sendStatus(200);
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
