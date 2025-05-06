const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
require('dotenv').config();


const PORT = 3001;

const serviceAccount = {
  type: process.env.GOOGLE_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT,
  universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
};


// Auth client
const auth = new google.auth.GoogleAuth({
  credentials:serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
app.get("/", async (req, res) => { 
    res.json({ message: "hello" });
});

app.get('/quiz/:name', async (req, res) => {
  const quizName = req.params.name;

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '1DgEjp7MnPcOpAIqR-5g8xbu2JnLO7gLybOPuwASxKWQ',
      range:quizName
    });

    const rows = response.data.values;

    if (!rows || rows.length < 3) {
      return res.status(400).json({ error: 'Invalid sheet format' });
    }

    const headers = rows[1];
  
    const questions = rows.slice(2).map((row) => ({
  question: row[headers.indexOf('question')],
  options: row[headers.indexOf('options')].split(',').map((opt) => opt.trim()),
  answer: row[headers.indexOf('answer')],
  image: row[headers.indexOf('image')] || '',  // If cell is empty, default to ''
}));

    res.json({ quizName: rows[0][0], questions });
  } catch (err) {
    console.error('Google Sheets error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz data',msg:err });
  }
});


app.post('/submit', async (req, res) => {
  const { name, register_number, score, department,year } = req.body;

  if (!name ||score == null) {
    return res.status(400).json({ error: 'Missing fields in submission' });
  }

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: '1DgEjp7MnPcOpAIqR-5g8xbu2JnLO7gLybOPuwASxKWQ',
      range: "result", // Make sure this tab exists
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[new Date().toLocaleString(), name, register_number, score, department,year]],
      },
    });

    res.status(200).json({ message: 'Submission saved successfully!' });
  } catch (err) {
    console.error('Error saving result to sheet:', err);
    res.status(500).json({ error: 'Failed to save result' });
  }
});

app.get('/submitted-registers', async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: '1DgEjp7MnPcOpAIqR-5g8xbu2JnLO7gLybOPuwASxKWQ',
      range: 'result!C2:C', // C2:C to skip the header
    });

    const rows = readResponse.data.values || [];

    // Flatten the rows and send as an array
    const registerNumbers = rows.map(row => row[0]);

    res.status(200).json({ registerNumbers });
  } catch (error) {
    console.error('Error fetching register numbers:', error);
    res.status(500).json({ error: 'Failed to fetch submitted register numbers' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
