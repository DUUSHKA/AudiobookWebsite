// Importing required modules
const express = require('express'); // Express web framework
const app = express(); // Creating an instance of the Express application
const fs = require('fs'); // File system module for file operations
const audio = require('audio'); // Assuming this is a custom module for audio handling

const audiobookFilePath = 'R1.mp3'; // Path to the audiobook file

// Route handler for the root URL '/'
app.get('/', (req, res) => {
  // Getting the file stats (size, etc.)
  const stat = fs.statSync(audiobookFilePath);

  // Getting the 'Range' header from the request
  const range = req.headers.range;

  // Getting the total size of the file
  const fileSize = stat.size;

  // Chunk size for streaming the file (1MB in this case)
  const chunkSize = 10 ** 6;

  let start = 0; // Start position for streaming
  let end = fileSize - 1; // End position for streaming

  // If the 'Range' header exists in the request, update the start and end positions accordingly
  if (range) {
    start = Number(range.replace(/\D/g, ""));
    end = Math.min(start + chunkSize, fileSize - 1);
  }

  // Calculate the content length of the response
  const contentLength = end - start + 1;

  // Set the response headers
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "audio/mpeg",
  };

  // Sending a response indicating successful server execution
  res.send({"obj":"Successfully run the audiobook server"});

  // Setting the status code and response headers
  res.writeHead(206, headers);

  // Creating a read stream for the audiobook file, starting and ending at the specified positions
  const stream = fs.createReadStream(audiobookFilePath, { start, end });

  // Piping the read stream to the response stream, enabling streaming of the audiobook file
  stream.pipe(res);
});

// Start the server and listen on port 4001
app.listen(4001, () => console.log('Audiobook server is running on port 4001!'));
