

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false, 
  },
});

app.get('/create-jobs-table', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE jobs (
        id SERIAL PRIMARY KEY,
        job_title VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        job_type VARCHAR(100),
        salary_min INTEGER,
        salary_max INTEGER,
        deadline DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    res.send('Jobs table created successfully.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating table.');
  }
});


app.post('/api/submit-jobs', async (req, res) => {
  console.log('sbubmit');
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
  console.log('connf get');
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
