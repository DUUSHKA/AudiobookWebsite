const express = require('express');
const mysql = require('mysql');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const paypal = require('paypal-rest-sdk');

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'AUDhXyu8N36h4c92KV16sojNXtnKgTO5faZgDDmcQuyTOf37wfcH6xOOkMgJFaUojlJkqoAgezCQBMR6',
  'client_secret': 'EJGebhU_dBaMP6R3ImzMwAB0vhmhPQ3tKZvcjb4uKit30DwKY6s1lT4_fC9XCYKXvd01o8u2uuoIwf2G'
});

// Connect to the MySQL database 
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "SWEPRoj2023",
    database: 'RUListening'
  });
  
let arr = [];
let bookObj = {};


app.use(express.static('public'));     
function sortCatalogAlphabetically(results) {
  results.sort(function(a, b) {
    var titleA = a.BookTitle.toUpperCase(); // ignore upper and lowercase
    var titleB = b.BookTitle.toUpperCase(); // ignore upper and lowercase
    if (titleA < titleB) {
      return -1;
    }
    if (titleA > titleB) {
      return 1;
    }

    // titles must be equal
    return 0;
  });

  return results;
}

function createArray(results) {
  const bookTitlesArray = [];
  
  results.forEach(function(row) {
    bookTitlesArray.push(row.BookTitle); //accessing the booktitle property and populating an array with it
  });

  return bookTitlesArray; //returns the populated array with bookTitles
}

function updateAutocomplete(suggestedTerms) {
  // Get the autocomplete list element
  const autocompleteList = document.getElementById("autocompleteList");

  // Clear the previous suggestions
  autocompleteList.innerHTML = "";

  // Add each suggested term as a list item
  suggestedTerms.forEach(function(term) {
    const listItem = document.createElement("li");
    listItem.textContent = term;
    autocompleteList.appendChild(listItem);
  });

  // Show the autocomplete list
  autocompleteList.style.display = "block";
}


app.get('/', function(req, res){
  res.render('homepage.ejs');
});

app.get('/catalog', function(req, res) {
  let query = 'SELECT * FROM Catalog';
  if(req.query.search){
      // append search query to the SQL query
      query += ` WHERE BookTitle LIKE '%${req.query.search}%' OR Author LIKE '%${req.query.search}%' OR Genre LIKE '%${req.query.search}%' OR Narrator LIKE '%${req.query.search}%'`;
      arr = [];
    }
    arr = [];
    //iterate and create bookobj and add to arr
    connection.query(query, function(err, result, fields) {
      if (err) throw err;
      result.forEach(function(row) {
        bookObj = {BookTitle: row.BookTitle, Author: row.Author, Genre: row.Genre, Price: row.Price, Narrator:row.Narrator, Summary: row.Summary};
        arr.push(bookObj);
      });
      const myJSONBooks = JSON.stringify(arr);
      const catalogTemplate = ejs.compile(fs.readFileSync('public/catalog.html', 'utf8'));
      const catalog = catalogTemplate({ Catalog: result });
      res.send(catalog);
  
  });
  //middleware for parsing incoming requests 
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
}); 
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
//generate autocomplete suggestions 
app.get('/autocomplete', function(req, res) {
    var searchTerm = req.query.term;
    //SQL query 
    var query = 'SELECT BookTitle FROM Catalog WHERE BookTitle LIKE ?';
    // Execute qeury
    connection.query(query, ['%' + searchTerm + '%'], function(err, rows, fields) {
        if (err) throw err;
        //map rows to an array of suggestions
        var suggestions = rows.map(function(row) {
            return row.BookTitle;
        });
        //send array as JSON responce 
        res.json(suggestions);
    });
});


//POST AND DELETE FOR WISHLIST
app.post('/addToWishlist', function(req, res) {
  let userId;
  try {
    userId = fs.readFileSync('userID.txt', 'utf8');
  } catch (error) {
    // handle the error
    console.log("Please, login before adding to your wishlist"); // show a user-friendly message
    res.redirect('http://localhost:3000/'); // redirect the user to the login page
  }
    //check to see if user is logged in then display this
    //if book exists in cart
    const BookID = req.body.BookID
    const userID = userId;
    const sql3 = "SELECT * FROM Wishlist WHERE BookID=?";
    connection.query(sql3, [BookID], (err, result) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } 
      else if (result.length > 0) {
        // if there is already a book with this BookID in the Wishlist, return an error message
        const errorMsg = {"obj":" This book is already in your wishlist."};
         
        res.send(errorMsg);
    }
    //if that book doesnt exist in wishlist
    else{
        const wishQuery = `INSERT INTO Wishlist (UserID, BookID) VALUES ('${userID}',?)`; //insert the bookid into the wishlist table
        connection.query(wishQuery, [BookID], (err, result) =>  {
            if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
            } 
            const testHtml3 = `<html>
            <a href="http://localhost:8083/wishlist">Wishlist</a>
            </html>`;
            res.send(testHtml3);
            //res.sendStatus(200);
        });
    }
    });
});
app.delete('/deleteFromWishlist', function(req, res){
  let userId;
  try {
    userId = fs.readFileSync('userID.txt', 'utf8');
    // process data here
  } catch (error) {
    // handle the error
    console.log("Please, login before deleting from your wishlist"); // show a user-friendly message
    res.redirect('http://localhost:3000/'); // redirect the user to the login page
  }
    const BookID = req.body.BookID
    const sql2 = "SELECT * FROM Wishlist WHERE BookID=?";
    connection.query(sql2, [BookID], (err, result) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        else if (result.length <= 0) {
            // if this book doesnt exist in the wishlist, return an error message
            const errorMsg2 = {"obj":"This book doesn't exist in your wishlist"};
            res.send(errorMsg2);
        }
        else{
            const wishQueryD = "DELETE FROM Wishlist WHERE BookID = ?"; //Delete the book from wishlist table
            connection.query(wishQueryD, [BookID], (err, result) =>  {
                if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
                } 
                else{
                    const testHtmlD = `<html>
                    <a href="http://localhost:8083/wishlist">Wishlist</a>
                    </html>`;
                    res.send(testHtmlD);
                    //res.sendStatus(200);
                }
            });
        }
    });

});



//POST AND DELETE FOR CART
app.post('/cart', (req, res) => {
  let userId;
  try {
    userId = fs.readFileSync('userID.txt', 'utf8');
    // process data here
  } catch (error) {
    // handle the error
    console.log("Please, login before adding to Cart"); // show a user-friendly message
    res.redirect('http://localhost:3000/'); // redirect the user to the login page
  }
  
    //check to see if user is logged in then display this
    const userID = userId;
    const BookID = req.body.BookID
    const sql1 = `SELECT * FROM Cart WHERE BookID=?`;
    connection.query(sql1, [BookID], (err, result) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } 
      else if (result.length > 0) {
        // if there is already a book with this BookID in the cart, return an error message
        const errorMsg = {"obj":"This book is already in your cart."};
        res.send(errorMsg);
    }
    //if book doesn't exist in cart
    else{
      const cartQuery = `INSERT INTO Cart (UserID, BookID) VALUES ('${userID}',?)`; //Insert the respective bookid into the Cart table
      connection.query(cartQuery, [BookID], (err, result) =>  {
          if (err) {
              console.log(err);
              res.sendStatus(500);
              return;
          } 
      
          const titleQuery = `SELECT BookTitle FROM Catalog WHERE BookID = '${BookID}'`; //grab the bookId to display the popup messge
          connection.query(titleQuery, (err, rows) => {
              if (err) {
                  console.log(err);
                  res.sendStatus(500);
                  return;
              }
      
              const BookName = rows[0].BookTitle; //access the booktitle property with the bookid value we grabbed
              const message = `${BookName} has been added to cart!`; //mesage the popup displays
              res.send(`<script>alert("${message}"); window.history.back();</script>`); //the alert tag displats the message as a popup
              //window.history.back() redirects the user back to wherever they were when they added the book to cart after they acknoledge the popup
          });
      });
      
    }
    });
});
app.delete('/cart', function(req, res){
  let userId;
  try {
    userId = fs.readFileSync('userID.txt', 'utf8');
    // process data here
  } catch (error) {
    // handle the error
    console.log("Please, login before deleting from Cart"); // show a user-friendly message
    res.redirect('http://localhost:3000/'); // redirect the user to the login page
  }
    const BookID = req.body.BookID
    const sql2 = `SELECT * FROM Cart WHERE BookID='${BookID}'`;
    connection.query(sql2, [BookID], (err, result) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        else if (result.length <= 0) {
            // if this book doesnt exist in the cart, return an error message
            const errorMsg2 = {"obj": "This book doesn't exist in your cart"};
            res.send(errorMsg2);
        }
        else{
            const cartQueryD = `DELETE FROM Cart WHERE BookID = '${BookID}'`; //Delete the respective book from Cart table
            connection.query(cartQueryD, [BookID], (err, result) =>  {
                if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
                } 
                else{

                  const BookName = rows[0].BookTitle; //grab the bookTitle to display the popup messge
                  const message = `${BookName} has been deleted from cart!`; //mesage the popup displays
                  res.send(`<script>alert("${message}"); window.history.back();</script>`); //the alert tag displats the message as a popup
                  //window.history.back() redirects the user back to wherever they were when they added the book to cart after they acknoledge the popup
                }
            });
        }
    });

});

let cart = [];
let bookid = [];
let cartObj = {};
let count = 0;
let totalPrice = 0; // initialize the total price to zero
//to show the cart page
app.get('/cart', function(req, res) {
  const BookID = req.body.BookID;
  let userId;
  try {
    userId = fs.readFileSync('userID.txt', 'utf8');
    // process data here
  } catch (error) {
    // handle the error
    console.log("Please, login before deleting from Cart"); // show a user-friendly message
    res.redirect('http://localhost:3000/'); // redirect the user to the login page
  }
  const cartSql = `SELECT * FROM Cart WHERE UserID = '${userId}'`; //only query items asscoaited with the userID of the user logged in at the moment 
  connection.query(cartSql, (err, result) =>{
    if (err) {
      console.log(err);
      res.sendStatus(500);
    }
    else{
        result.forEach(function(row) {//to access each book in the cart table
            const obj = `SELECT * FROM Catalog WHERE BookID = '${row.BookID}'`; //query each row
            connection.query(obj, (err, objRes) =>{
                if (err) {
                    console.log(err);
                    res.sendStatus(500);
                }
            const book = objRes[0];
            bookObj = {BookTitle: book.BookTitle, Price: book.Price}; //access the booktitle and the price properties of each book and put it into a bookobj
            //console.log(cartObj);
            bookid.push(book.BookID);//populate an array with the bookids of these books
            cart.push(bookObj);//populate a cart array with these bookobjs
            count = cart.length; //get the total number of items in cart pertainign to the user that's logged in
            totalPrice = totalPrice + book.Price; //calaculate tht total price of the items in cart by accessing each book's price property and addign them up
            cartObj = {cart: cart, totalPrice: totalPrice, bookid: bookid}; //put all these properties into a carobj to send the data to the frotn end that will eb displaying this

            });
        });
    }
  });
  res.render('cart.ejs', { cart: cart, totalPrice: totalPrice,  bookid: bookid}); //render the front end
  //res.send(cartObj);  
});






//to add and delete a review
app.get('/review', (req, res) =>{
  //console.log(BookID);
  res.sendFile(path.join(__dirname, 'public','review.html'));
});
app.post('/review', (req, res) =>{
  //make a review button on catalog that will redirect people to a review.html
  let userId;
  const BookID = req.body.BookID;
  try {
    userId = fs.readFileSync('userID.txt', 'utf8');
    // process data here
  } catch (error) {
    // handle the error
    console.log("Please, login before adding a Review"); // show a user-friendly message
    res.redirect('http://localhost:3000/'); // redirect the user tothe login page
  }
  const review = req.body.review;
  const rating = req.body.rating;

  //console.log(review);
  //console.log(rating);
  if(res){
    let reviewQuery = `INSERT INTO Reviews (BookID, UserID, review, rating ) VALUES ('${BookID}', '${userId}', '${review}', '${rating}')`; //insert into the Reviews table
    connection.query(reviewQuery, (err, result) =>  {
      if (err) {
      console.log(err);
      res.sendStatus(500);
      return;
      }
    res.send({"obj":"Review submitted successfully"});
    });

  }

  else{
    res.send("Please fill out the fields.");
  }
  });
  app.delete('/review', (req, res) => {
    let userId;
    const BookID = req.body.BookID;
    try {
      userId = fs.readFileSync('userID.txt', 'utf8');
      // process data here
    } catch (error) {
      // handle the error
      console.log("Please, login before deleting a Review"); // show a user-friendly message
      res.redirect('http://localhost:3000/'); // redirect the user to the login page
    }
    const reviewQueryD = "DELETE FROM Reviews WHERE BookID = ?"; //delete ht erespective review from the Reviews table
      connection.query(reviewQueryD, [BookID], (err, result) =>  {
          if (err) {
          console.log(err);
          res.sendStatus(500);
          return;
        }
        else{
          res.send({"obj": "Review deleted successfully"});
        }
      });
  });
  app.get('/Showreview', (req, res) =>{ //to show the reviews written for a specific books
    let userId;
    const BookID = req.query.BookID;

    const reviewQuery = `SELECT review FROM Reviews WHERE BookID = '${BookID}'`; //select the review from the Reviews table pertianign to a book

    connection.query(reviewQuery, [BookID], (err, result) =>{
      if(err){
        return console.log(err);
      }
      res.render('review.ejs', {Reviews: result}); //render the review page which showcases all the reviews left for a specific book
    });
  });

  app.post('/checkout', (req, res) => {
    // Get the list of book IDs in the cart from the database
    const userId = fs.readFileSync('userID.txt', 'utf8');
    const cartSql = `SELECT * FROM Cart WHERE UserID = '${userId}'`;
    connection.query(cartSql, (err, result) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        result.forEach(function(row){
          const bookIds = result[0].BookID;
        // Get the details of the books in the cart
        const booksSql = `SELECT * FROM Catalog WHERE BookID='${bookIds}'`;
        connection.query(booksSql, (err, booksResult) => {
          if (err) {
            console.log(err);
            res.sendStatus(500);
          } else {
            // Calculate the total price
            const total = booksResult.reduce((acc, book) => acc + book.Price, 0);
  
            // Create a PayPal payment object
            const paypalPayment = {
              intent: 'sale',
              payer: {
                payment_method: 'paypal'
              },
              redirect_urls: {
                return_url: 'http://localhost:8081/checkout/success',
                cancel_url: 'http://localhost:8081/checkout/cancel'
              },
              transactions: [{
                item_list: {
                  items: booksResult.map(book => ({
                    name: book.BookTitle,
                    sku: book.BookID,
                    price: book.Price.toFixed(2),
                    currency: 'USD',
                    quantity: 1
                  }))
                },
                amount: {
                  currency: 'USD',
                  total: total.toFixed(2)
                },
                description: 'Books from my store'
              }]
            };
  
            // Send the PayPal payment request
            paypal.payment.create(paypalPayment, (err, payment) => {
              if (err) {
                console.log(err);
                res.sendStatus(500);
              } else {
                // Save the payment ID to the database
                const paymentId = payment.id;
                const insertPaymentSql = `INSERT INTO Payments (UserID, PaymentID, Amount, BookID) VALUES ('${userId}', '${paymentId}', ${total}, '${bookIds}')`;
                connection.query(insertPaymentSql, (err) => {
                  if (err) {
                    console.log(err);
                    res.sendStatus(500);
                  } else {
                    // Redirect to PayPal for payment
                    const redirectUrl = payment.links.find(link => link.rel === 'approval_url').href;
                    res.redirect(redirectUrl);
                  }
                });
              }
            });
          }
        });
        });
      }
    });
  });
  // Handle PayPal return URL for successful payments
  app.get('/checkout/success', (req, res) => {
    const userId = fs.readFileSync('userID.txt', 'utf8');
    const paymentId = req.query.paymentId;
    const payerId = req.query.PayerID;
  
    // Execute the PayPal payment
    paypal.payment.execute(paymentId, { payer_id: payerId }, (err, payment) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        // Update the database to mark the payment as complete
        const updatePaymentSql = `UPDATE Payments SET Complete = 1 WHERE UserID = '${userId}' AND PaymentID = '${paymentId}'`;
        connection.query(updatePaymentSql, (err) => {
          if (err) {
            console.log(err);
            res.sendStatus(500);
          } else {
            // Clear the user's cart
            const clearCartSql = `DELETE FROM Cart WHERE UserID = '${userId}'`;
            connection.query(clearCartSql, (err) => {
              if (err) {
                console.log(err);
                res.sendStatus(500);
              } else {
                // Add purchased books to user's account
                const booksSql = `SELECT * FROM Catalog WHERE BookID IN (SELECT BookID FROM Payments WHERE UserID = '${userId}')`;
                connection.query(booksSql, (err, booksResult) => {
                  if (err) {
                    console.log(err);
                    res.sendStatus(500);
                  } else {
                    const purchasedBooks = booksResult.map(book => book.BookID);
                    const insertAccountSql = `UPDATE Accounts SET YourBooks = '${purchasedBooks.join()}' WHERE id = '${userId}'`;
                    connection.query(insertAccountSql, (err) => {
                      if (err) {
                        console.log(err);
                        res.sendStatus(500);
                      } else {
                        res.send('Payment complete. Your books have been added to your account.');
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  });
  app.get('/your-books', (req, res) => {
    try {
      userId = fs.readFileSync('userID.txt', 'utf8');
      // process data here
    } catch (error) {
      // handle the error
      console.log("Please, login before deleting a Review"); // show a user-friendly message
      res.redirect('http://localhost:3000/'); // redirect the user to the login page
    }
    const yourBooksSql = `SELECT * FROM accounts WHERE UserID = '${userId}'`; //grab the user id from accounts
    connection.query(yourBooksSql, (err, result) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        result.forEach(function(row){
          const bookIds = result[0].BookID;
          const booksSql = `SELECT * FROM Catalog WHERE BookID='${bookIds}'`; //query the books in the YourBooks column of this specific user.
          connection.query(booksSql, (err, booksResult) => {
            if (err) {
              console.log(err);
              res.sendStatus(500);
            } else {
              res.render('your-books', { books: booksResult }); //render the yourbooks page which has a link to listen to the book and an option to leave a review
            }
          });
        });
      }
    });
  });
  app.get('/publisher', function(req, res){
    res.sendFile(path.join(__dirname, 'public','publisher.html'));
  });
  
  // Handle form submission
  app.post('/add', (req, res) => {
    // Get form data from request body
    const { newTitle, newAuthor, newGenre, newSummary, newNarrator, newBookID, newPrice} = req.body;
  
    // Define SQL query to insert book data into database
    const sql = 'INSERT INTO Catalog (BookTitle, Author, Genre, Summary, Narrator, BookID, Price) VALUES (?,?,?,?,?,?,?)';
  
    // Execute the query using the MySQL connection pool
    connection.query(sql, [newTitle, newAuthor, newGenre, newSummary, newNarrator, newBookID, newPrice], (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error adding book');
      } else {
        const message = `Your book has been added to our catalog for users to purchase!`;
        res.send(`<script>alert("${message}"); window.history.back();</script>`);      }
    });
  });
app.get('/account', (req, res) => {
  try {
    userId = fs.readFileSync('userID.txt', 'utf8');
    // process data here
  } catch (error) {
    // handle the error
    console.log("Please, login before accessing your Account"); // show a user-friendly message
    res.redirect('http://localhost:3000/'); // redirect the user to the login page
  }
  res.sendFile(path.join(__dirname, 'public','account.html'));
});
  




// Start the server
app.listen(8081, function() {
    console.log('Server started http://localhost:8081');
  });
