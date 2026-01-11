// Import required modules
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const os = require('os');

// Initialize Express application
const app = express();
const PORT = 3000;

// MongoDB connection parameters
// process.env.MONGO_URI allows external configuration (important for containers)
// Falls back to localhost if not specified
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'milestone2';
const COLLECTION_NAME = 'users';

// Global MongoDB client reference
let mongoClient;

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Enable CORS for all routes
// This allows the frontend (running on different origin) to call this API
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// ============================================
// DATABASE INITIALIZATION
// ============================================

// Function to connect to MongoDB
async function connectDatabase() {
  try {
    // Create MongoDB client (does not connect yet)
    mongoClient = new MongoClient(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Set connection timeout to 5 seconds
      serverSelectionTimeoutMS: 5000,
    });

    // Establish connection to MongoDB server
    await mongoClient.connect();
    console.log('✓ Connected to MongoDB successfully');

    // Get database reference
    const db = mongoClient.db(DB_NAME);

    // Initialize default user if collection is empty
    const usersCollection = db.collection(COLLECTION_NAME);
    const userCount = await usersCollection.countDocuments();

    // If no users exist, insert default document
    if (userCount === 0) {
      await usersCollection.insertOne({
        name: 'maarten',
        createdAt: new Date(),
      });
      console.log('✓ Default user "maarten" created');
    }
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
    // Retry connection after 5 seconds
    setTimeout(connectDatabase, 5000);
  }
}

// ============================================
// REST ENDPOINTS
// ============================================

/**
 * GET /user
 * Returns the user information from the database
 * 
 * Response format: { "name": "maarten" }
 */
app.get('/user', async (req, res) => {
  try {
    // Get database reference
    const db = mongoClient.db(DB_NAME);
    const usersCollection = db.collection(COLLECTION_NAME);

    // Find the first user document in the collection
    // findOne() returns a single document or null
    const user = await usersCollection.findOne({});

    // If user doesn't exist, return error response
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        name: 'Unknown'
      });
    }

    // Return user data as JSON
    res.json({
      name: user.name,
      _id: user._id.toString()
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    // Return error response with appropriate HTTP status
    res.status(500).json({
      error: 'Internal server error',
      name: 'Error'
    });
  }
});

/**
 * GET /container-id
 * Returns the container ID (derived from hostname)
 * In Docker/Kubernetes, the hostname equals the container ID
 * 
 * Response format: { "containerId": "abc123def456" }
 */
app.get('/container-id', (req, res) => {
  try {
    // os.hostname() returns the container ID in Docker/Kubernetes environments
    // In local development, returns the machine hostname
    const containerID = os.hostname();

    res.json({
      containerId: containerID,
      environment: process.env.NODE_ENV || 'production'
    });
  } catch (error) {
    console.error('Error fetching container ID:', error);
    res.status(500).json({
      error: 'Internal server error',
      containerId: 'Error'
    });
  }
});

/**
 * PUT /user/:newName
 * Updates the user name in the database
 * This endpoint allows changing the name, which is reflected on the frontend after refresh
 * 
 * URL: /user/newname
 * Response: { "success": true, "name": "newname" }
 */
app.put('/user/:newName', async (req, res) => {
  try {
    const { newName } = req.params;

    const db = mongoClient.db(DB_NAME);
    const usersCollection = db.collection(COLLECTION_NAME);

    // updateOne() modifies a document in place
    // filter: {} finds any document (in this case the first one)
    // update: { $set: { name: newName } } sets the name field
    const result = await usersCollection.updateOne(
      {},
      { $set: { name: newName } }
    );

    // If no documents were modified, user didn't exist
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      name: newName,
      message: 'User name updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /health
 * Health check endpoint for Kubernetes liveness and readiness probes
 * Returns 200 OK if the service is healthy and connected to MongoDB
 */
app.get('/health', async (req, res) => {
  try {
    if (!mongoClient || !mongoClient.topology || !mongoClient.topology.isConnected()) {
      return res.status(503).json({ 
        status: 'unhealthy',
        message: 'Database connection lost'
      });
    }
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ============================================
// SERVER STARTUP
// ============================================

// Connect to database before starting server
connectDatabase().then(() => {
  // Start Express server on port 3000
  // Listen on 0.0.0.0 to accept connections from any interface
  // This is crucial for container networking - localhost wouldn't work
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ API server running on port ${PORT}`);
    console.log(`✓ Endpoints available:`);
    console.log(`  - GET /user`);
    console.log(`  - GET /container-id`);
    console.log(`  - PUT /user/:newName`);
    console.log(`  - GET /health (health checks)`);
  });
});

// Handle graceful shutdown
// Ensures MongoDB connection is closed properly
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});