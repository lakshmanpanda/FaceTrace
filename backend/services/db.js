const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create a PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'lakshman&66',
  database: process.env.PGDATABASE || 'postgres',
  port: process.env.PGPORT || 5432,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Initialize database tables if they don't exist
const initDatabase = async () => {
  try {
    // Create faces table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faces (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        encoding BYTEA NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Check if name already exists in database
const checkNameExists = async (name) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM faces WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Error checking name existence:', error);
    throw error;
  }
};

// Store face encoding in database
const storeFaceEncoding = async (name, encoding) => {
  try {
    // First check if name already exists
    const nameExists = await checkNameExists(name);
    
    if (nameExists) {
      throw new Error(`A face with the name "${name}" already exists. Please use a different name.`);
    }
    
    const result = await pool.query(
      'INSERT INTO faces (name, encoding) VALUES ($1, $2) RETURNING id, created_at',
      [name, encoding]
    );
    
    return {
      id: result.rows[0].id,
      name,
      created_at: result.rows[0].created_at
    };
  } catch (error) {
    console.error('Error storing face encoding:', error);
    throw error;
  }
};

// Get all registered faces
const getRegisteredFaces = async () => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM faces ORDER BY created_at DESC'
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting registered faces:', error);
    throw error;
  }
};

// Get face encodings for recognition
const getFaceEncodings = async () => {
  try {
    const result = await pool.query(
      'SELECT id, name, encoding FROM faces'
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting face encodings:', error);
    throw error;
  }
};

// Get a face by ID
const getFaceById = async (id) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM faces WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting face by ID:', error);
    throw error;
  }
};

// Get the last registered face
const getLastRegisteredFace = async () => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM faces ORDER BY created_at DESC LIMIT 1'
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting last registered face:', error);
    throw error;
  }
};

// Count the total number of registered faces
const countRegisteredFaces = async () => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM faces');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error counting registered faces:', error);
    throw error;
  }
};

// Get face registration by name
const getFaceByName = async (name) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM faces WHERE name ILIKE $1 ORDER BY created_at DESC LIMIT 1',
      [`%${name}%`]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting face by name:', error);
    throw error;
  }
};

// Initialize database on module load
initDatabase().catch(console.error);

module.exports = {
  pool,
  storeFaceEncoding,
  getRegisteredFaces,
  getFaceEncodings,
  getFaceById,
  getLastRegisteredFace,
  countRegisteredFaces,
  getFaceByName,
  checkNameExists
};
