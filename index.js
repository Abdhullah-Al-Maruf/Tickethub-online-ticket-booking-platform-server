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
    const usersCollection = db.collection("user");
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
          isVisible: true,
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

        const result = await ticketsCollection.find(query).sort({ createdAt: -1 }).toArray(); // sort for show latest tickets
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
        const result = await ticketsCollection.find().sort({ createdAt: -1 }).toArray();

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
      try {
        const { id } = req.params;
        const query = {
          _id: new ObjectId(id),
        };
        const updatedData = {
          $set: {
            status: "approved",
            updatedAt: new Date(),
          },
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

      app.patch("/api/admin/tickets/:id/reject", async (req, res) => {
        try {
          const { id } = req.params;
          const query = {
            _id: new ObjectId(id),
          };
          const updatedData = {
            $set: {
              status: "rejected",
              updatedAt: new Date(),
            },
          };
          const result = await ticketsCollection.updateOne(query, updatedData);
          res.status(200).send({
            success: true,
            message: "successfully Updated status to rejected",
            result,
          });
        } catch (error) {
          res.status(500).send({
            success: false,
            message: "Failed to reject ticket.",
            error: error.message,
          });
        }
      });
  
// 3. Advertise ticket (Maximum 6 tickets)
app.patch("/api/admin/tickets/:id/advertise", async (req, res) => {
  try {
    const { id } = req.params;

    // Count currently advertised tickets
    const advertisedCount = await ticketsCollection.countDocuments({
      advertised: true,
      status: "approved",
      isVisible: true,
    });

    // Don't allow more than 6 advertised tickets
    if (advertisedCount >= 6) {
      return res.status(400).send({
        success: false,
        message: "Maximum 6 advertised tickets are allowed.",
      });
    }

    // Find only approved & visible ticket
    const query = {
      _id: new ObjectId(id),
      status: "approved",
      isVisible: true,
    };

    const updateDoc = {
      $set: {
        advertised: true,
        updatedAt: new Date(),
      },
    };

    const result = await ticketsCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Ticket not found or it is not approved/visible.",
      });
    }

    if (result.modifiedCount === 0) {
      return res.status(200).send({
        success: true,
        message: "Ticket is already advertised.",
        result,
      });
    }

    res.status(200).send({
      success: true,
      message: "Ticket advertised successfully.",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to advertise ticket limit reached to 6",
      error: error.message,
    });
  }
});
    // 4.for unadvertise ticket
    app.patch("/api/admin/tickets/:id/unadvertise", async (req, res) => {
      try {
        const { id } = req.params;
        const query = {
          _id: new ObjectId(id),
        };
        const updatedData = {
          $set: {
            advertised: false,
            updatedAt: new Date(),
          },
        };
        const result = await ticketsCollection.updateOne(query, updatedData);
        res.status(200).send({
          success: true,
          message: "successfully unadvertised",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to unadvertised ticket.",
          error: error.message,
        });
      }
    });

    // 5. for get all user
    app.get("/api/admin/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.status(200).send({
          success: true,
          message: "fetched all user from user collection successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to fetched users.",
          error: error.message,
        });
      }
    });

    // 6.make admin
    app.patch("/api/admin/users/:id/make-admin", async (req, res) => {
      try {
        const { id } = req.params;
        const query = {
          _id: new ObjectId(id),
        };
        const updatedData = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(query, updatedData);
        // User not found
        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        // User is already an admin
        if (result.modifiedCount === 0) {
          return res.status(200).send({
            success: true,
            message: "User is already an admin",
            result,
          });
        }

        res.status(200).send({
          success: true,
          message: "successfully role changed to admin",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to change role as admin",
          error: error.message,
        });
      }
    });

    // 6. for making vendor
    app.patch("/api/admin/users/:id/make-vendor", async (req, res) => {
      try {
        const { id } = req.params;
        const query = {
          _id: new ObjectId(id),
        };
        const updatedData = {
          $set: {
            role: "vendor",
          },
        };
        const result = await usersCollection.updateOne(query, updatedData);
        // User not found
        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        // User is already an vendor
        if (result.modifiedCount === 0) {
          return res.status(200).send({
            success: true,
            message: "User is already an vendor",
            result,
          });
        }

        res.status(200).send({
          success: true,
          message: "successfully role changed to vendor",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to change role as vendor",
          error: error.message,
        });
      }
    });

    // 8.update user to fraud
    // todo:make  verifyVendorNotFraud jwt
    app.patch("/api/admin/users/:id/fraud", async (req, res) => {
      try {
        const { id } = req.params;
        const query = {
          _id: new ObjectId(id),
        };
        const updatedData = {
          $set: {
            isFraud: true,
          },
        };

        const result = await usersCollection.updateOne(query, updatedData);

        // User not found
        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        // Already marked as fraud
        if (result.modifiedCount === 0) {
          return res.status(200).send({
            success: true,
            message: "User is already marked as fraud",
            result,
          });
        }

        // get user email
        const user = await usersCollection.findOne(query);
        //  check user exist or not
        if (!user) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        // hide by email
        const hideQuery = {
          "vendor.email": user.email,
        };

        // update the visibility
        const updateDoc = {
          $set: {
            isVisible: false,
            updatedAt: new Date(),
          },
        };
        // hide all tickets
        await ticketsCollection.updateMany(hideQuery, updateDoc);

        res.status(200).send({
          success: true,
          message: "mark as fraud",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to mark as fraud",
          error: error.message,
        });
      }
    });
    // api for unfraud

    // todo:make  verifyVendorNotFraud jwt
    app.patch("/api/admin/users/:id/unfraud", async (req, res) => {
      try {
        const { id } = req.params;
        const query = {
          _id: new ObjectId(id),
        };
        const updatedData = {
          $set: {
            isFraud: false,
          },
        };

        const result = await usersCollection.updateOne(query, updatedData);

        // User not found
        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        // Already marked as fraud
        if (result.modifiedCount === 0) {
          return res.status(200).send({
            success: true,
            message: "User is already marked as un-fraud",
            result,
          });
        }

        // get user email
        const user = await usersCollection.findOne(query);
        // check use exist or not
        if (!user) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }
        const showQuery = {
          "vendor.email": user.email,
        };
        // update the visibility
        const updateDoc = {
          $set: {
            isVisible: true,
            updatedAt: new Date(),
          },
        };
        // show  all tickets
        await ticketsCollection.updateMany(showQuery, updateDoc);

        res.status(200).send({
          success: true,
          message: "mark as un-fraud",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to mark as un-fraud",
          error: error.message,
        });
      }
    });

    //  api for public pages for collecting all the approved tickets data
    //1. api for all tickets page
    // todo:make  verifyVendorNotFraud jwt
app.get("/api/tickets", async (req, res) => {
  try {
    // Get pagination params from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      status: "approved",
      isVisible: true,
    };

    // Get total count (for total pages)
    const total = await ticketsCollection.countDocuments(query);

    // Fetch paginated results
    const result = await ticketsCollection
      .find(query)
      .skip(skip)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    res.status(200).send({
      success: true,
      message: "Tickets fetched successfully",
      result,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch tickets",
      error: error.message,
    });
  }
});
    //2. api for single tickets details in all  tickets page
    // todo:make  verifyVendorNotFraud jwt
    app.get("/api/ticket/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = {
          _id: new ObjectId(id),
          status: "approved",
          isVisible: true,
        };
        const result = await ticketsCollection.findOne(query);
        res.status(200).send({
          success: true,
          message: "single ticket data fetched successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to fetched single ticket data",
          error: error.message,
        });
      }
    });

    // public api for showing advertised ticket

    app.get("/api/home/advertised", async (req, res) => {
      try {
        const query = {
          advertised: true,
          status: "approved",
          isVisible: true,
        };

        const result = await ticketsCollection
          .find(query)
          .sort({ createdAt: -1 }) //show new tickets first
          .limit(6)
          .toArray();
        res.status(200).send({
          success: true,
          message: "only advertised tickets are fetched",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to fetched advertise ticket data",
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
