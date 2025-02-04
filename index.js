require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
const urlParser = require('url');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB"))
  .catch(err => console.log("MongoDB Connection Error:", err));

// Schema & Model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const Url = mongoose.model("Url", urlSchema);

// Serve Frontend
app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', (req, res) => res.sendFile(process.cwd() + '/views/index.html'));

// API Test Endpoint
app.get('/api/hello', (req, res) => res.json({ greeting: 'hello API' }));

// POST: Shorten URL
app.post('/api/shorturl', async (req, res) => {
  let { url } = req.body;

  // Validate URL format
  const urlRegex = /^(https?:\/\/)/;
  if (!urlRegex.test(url)) return res.json({ error: "invalid url" });

  // Check DNS validity
  let hostname = urlParser.parse(url).hostname;
  dns.lookup(hostname, async (err) => {
    if (err) return res.json({ error: "invalid url" });

    // Generate a unique short URL
    let shortUrl = Math.floor(Math.random() * 10000);
    
    // Save to database
    let newUrl = new Url({ original_url: url, short_url: shortUrl });
    await newUrl.save();
    
    res.json({ original_url: url, short_url: shortUrl });
  });
});

// GET: Redirect to Original URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  let shortUrl = req.params.short_url;

  let urlData = await Url.findOne({ short_url: shortUrl });
  if (!urlData) return res.json({ error: "No short URL found" });

  res.redirect(urlData.original_url);
});

// Start Server
app.listen(port, () => console.log(`Listening on port ${port}`));
