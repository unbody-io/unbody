// Script to initialize replica set on first run

// Check if MongoDB is ready
function checkMongoReady() {
  try {
    db.runCommand({ ping: 1 });
    return true;
  } catch (e) {
    return false;
  }
}

// Wait for MongoDB to be ready (up to 30 seconds)
let attempts = 0;
while (!checkMongoReady()) {
  print("Waiting for MongoDB to be ready...");
  const delay = attempts * 500;
  sleep(delay);
  attempts++;
  if(attempts >= 6){
    throw new Error("MongoDB not ready after 30s.")
  }
}

// Initialize replica set
try {
  rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "localhost:27017" }
    ]
  });
  print("Replica set initialized successfully");
} catch (error) {
  print("Error initializing replica set:", error);
  throw error;
}
