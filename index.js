require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const app = express();
const port = process.env.PORT;

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleware
app.use(express.json());
app.use(cors());

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const db = client.db("ticket-hub");
    const ticketsCollection = db.collection("tickets");
    const bookingCollection = db.collection("bookings");
    const paymentCollection = db.collection("payments");

    // vendors apis
    // 1.post api for add tickets
    app.post("/api/add-ticket", async (req, res) => {
      try {
        const ticketsData = req.body;
        const addData = {
          ...ticketsData,
          createdAt: new Date(),
          advertised: false,
          updatedAt: new Date(),
        };
        const result = await ticketsCollection.insertOne(addData);
        res.status(201).send({
          success:true,
          message:"Ticket added successfully waiting for approval",
          
          result});

      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to add ticket.",
          error: error.message,
        });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
    // Ensures that the client will close when you finish/errorJ
    // await client.close();
  }
}
run().catch(console.dir);
