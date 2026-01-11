
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = 3000;


const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'milestone2';
const COLLECTION_NAME = 'users';

let mongoClient;


app.use(cors());

app.use(express.json());

async function connectDatabase() {
  try {
    // Create MongoDB client 
    mongoClient = new MongoClient(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    // connection to MongoDB server
    await mongoClient.connect();
    console.log('✓ Connected to MongoDB successfully');

    const db = mongoClient.db(DB_NAME);

    const usersCollection = db.collection(COLLECTION_NAME);
    const userCount = await usersCollection.countDocuments();

    if (userCount === 0) {
      await usersCollection.insertOne({
        name: 'maarten',
        createdAt: new Date(),
      });
      console.log('✓ Default user "maarten" created');
    }
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
    setTimeout(connectDatabase, 5000);
  }
}

app.get('/user', async (req, res) => {
  try {
    const db = mongoClient.db(DB_NAME);
    const usersCollection = db.collection(COLLECTION_NAME);

    const user = await usersCollection.findOne({});

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        name: 'Unknown'
      });
    }
    res.json({
      name: user.name,
      _id: user._id.toString()
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Internal server error',
      name: 'Error'
    });
  }
});

app.get('/container-id', (req, res) => {
  try {

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

app.put('/user/:newName', async (req, res) => {
  try {
    const { newName } = req.params;

    const db = mongoClient.db(DB_NAME);
    const usersCollection = db.collection(COLLECTION_NAME);
    const result = await usersCollection.updateOne(
      {},
      { $set: { name: newName } }
    );

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

connectDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ API server running on port ${PORT}`);
    console.log(`✓ Endpoints available:`);
    console.log(`  - GET /user`);
    console.log(`  - GET /container-id`);
    console.log(`  - PUT /user/:newName`);
    console.log(`  - GET /health (health checks)`);
  });
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});
