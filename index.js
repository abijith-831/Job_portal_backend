// backend/index.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();  // Load environment variables from .env file

const app = express();
const PORT = 5000;

app.use(cors({
  origin: "http://localhost:5173",
}));
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,         // Fetch from .env
  host: process.env.DB_HOST,         // Fetch from .env
  database: process.env.DB_DATABASE, // Fetch from .env
  password: process.env.DB_PASSWORD, // Fetch from .env
  port: process.env.DB_PORT,         // Fetch from .env
});

app.post('/api/submit-jobs', async (req, res) => {
  const {
    job_title,
    company_name,
    location,
    job_type,
    salary_min,
    salary_max,
    deadline,
    description,
  } = req.body;

  if (!job_title || !company_name) {
    return res.status(400).json({ error: 'Job title and company name are required.' });
  }

  try {
    await pool.query(
      `INSERT INTO jobs 
        (job_title, company_name, location, job_type, salary_min, salary_max, deadline, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [job_title, company_name, location, job_type, salary_min, salary_max, deadline, description]
    );

    res.status(201).json({ message: 'Job saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving job' });
  }
});

app.get('/api/get-jobs', async (req, res) => {
  const { title, location, jobType, salary } = req.query;

  const allEmpty =
    (!title || title.trim() === '') &&
    (!location || location.trim() === '') &&
    (!jobType || jobType.trim() === '') &&
    (!salary || salary.trim() === '');

  let query = 'SELECT * FROM jobs';

  let queryParams = [];

  if (!allEmpty) {
    let conditions = [];

    if (title && title.trim() !== '') {
      conditions.push(`job_title ILIKE $${queryParams.length + 1}`);
      queryParams.push(`%${title.trim()}%`);
    }
    if (location && location.trim() !== '') {
      conditions.push(`location = $${queryParams.length + 1}`);
      queryParams.push(location.trim());
    }
    if (jobType && jobType.trim() !== '') {
      conditions.push(`job_type = $${queryParams.length + 1}`);
      queryParams.push(jobType.trim());
    }
    if (salary && salary.trim() !== '') {
      conditions.push(`salary_max >= $${queryParams.length + 1}`);
      queryParams.push(parseInt(salary.trim()));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
  }

  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Error fetching jobs' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
