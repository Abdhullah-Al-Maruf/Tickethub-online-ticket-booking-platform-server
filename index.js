require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
          success: true,
          message: "Ticket added successfully waiting for approval",

          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to add ticket.",
          error: error.message,
        });
      }
    });

    // get  vendor tickets data
    app.get("/api/tickets/vendor/:email", async (req, res) => {
      try {
        const { email } = req.params; // get the email form the parameter eg: GET /api/tickets/vendor/sumon@gmail.com
        const query = {
          "vendor.email": email, // it will depend on how your data store in db
        };

        const result = await ticketsCollection.find(query).toArray();
        res.status(200).send({
          success: true,
          message: "successfully fetched vendor tickets",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to get  tickets.",
          error: error.message,
        });
      }
    });
    // update the tickets data for vendor using patch
    app.patch("/api/update-tickets/:id", async (req, res) => {
      try {
        // get id and email
        const { id } = req.params;
        const data = req.body;
        // set query
        const query = {
          _id: new ObjectId(id),
          // "vendor.email": req.user.email //it will work when its jwt verified
        };
        // update data
        const updatedData = {
          $set: {
            // ...data, this will give access to update all data
            // specify data for update
            title: data.title,
            pricePerSeat: data.pricePerSeat,
            quantityAvailable: data.quantityAvailable,
            transportType: data.transportType,
            route: data.route,
            schedule: data.schedule,
            perks: data.perks,
            imageUrl: data.imageUrl,
            updatedAt: new Date(),
          },
        };
        const result = await ticketsCollection.updateOne(query, updatedData);
        res.status(200).send({
          success: true,
          message: "successfully updated ticket",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to get  tickets.",
          error: error.message,
        });
      }
    });

    // api for delete tickets for vendor using delete
    app.delete("/api/delete-tickets/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = {
          _id: new ObjectId(id),
          // "vendor.email":req.user?.email  // use when jwt verified for extra safety
        };
        const result = await ticketsCollection.deleteOne(query);

        // Check if a document was actually deleted
        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Ticket not found.",
          });
        }

        res.status(200).send({
          success: true,
          message: "Data deleted successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "failed to delete",
          error: error.message,
        });
      }
    });

    // Admin related api goes below

    // 1.get all vendor tickets
    app.get("/api/admin/tickets", async (req, res) => {
      try {
        const result = await ticketsCollection.find().toArray();

        res.status(200).send({
          success: true,
          message: "successfully fetched vendor tickets",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to get  tickets.",
          error: error.message,
        });
      }
    });

// api for  updating status 
// 1.for approved tickets 
app.patch("/api/admin/tickets/:id/approve", async (req, res) => {
 try{
  const {id} =req.params;
  const query={
    _id:new objectId(id)
  }
  const updatedData={
    $set:{
      status:"approved",
      updatedAt:new Date()
    }
  };
  const result = await ticketsCollection.updateOne(query, updatedData);
  res.status(200).send({
    success: true,
    message: "Ticket approved successfully",
    result,
  });
} catch (error) {
  res.status(500).send({
    success: false,
    message: "Failed to approve ticket.",
      error: error.message,
    });
  }
}),

// 2.for reject tickets

app.patch("/api/admin/tickets/:id/reject", async (req,res)=>{
  try {
    const {id}=req.params;
    const query= {
      _id:new objectId(id)
    }
    const updatedData={
      $set:{
        status:"rejected",
        updatedAt:new Date()
      }
    }
    const result=await ticketsCollection.updateOne(query,updatedData)
    res.status(200).send({
      success:true,
      message:"successfully Updated status",
      result
    })
  } catch (error) {
    
  }
})




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
