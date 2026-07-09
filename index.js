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

// api for get user booking from booking collection and approve reject them
// 1. get all booking only by email
app.get("/api/vendor/bookings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const query = {
      "vendor.email": email,
    };

    const result = await bookingCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Vendor booking requests fetched successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch booking requests",
      error: error.message,
    });
  }
});

// vendor approve user ticket
// Approve booking
app.patch("/api/vendor/bookings/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    const query = {
      _id: new ObjectId(id),
    };

    const updateDoc = {
      $set: {
        status: "approved",
        updatedAt: new Date(),
      },
    };

    const result = await bookingCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Booking approved successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to approve booking",
      error: error.message,
    });
  }
});

// vendor reject user booking 
// Reject booking
app.patch("/api/vendor/bookings/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;

    const query = {
      _id: new ObjectId(id),
    };

    const updateDoc = {
      $set: {
        status: "rejected",
        updatedAt: new Date(),
      },
    };

    const result = await bookingCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Booking rejected successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to reject booking",
      error: error.message,
    });
  }
});

// revenue overview page api 

// GET /api/vendor/revenue-stats/:email
app.get("/api/vendor/revenue-stats/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const [totalTicketsAdded, agg] = await Promise.all([
      ticketsCollection.countDocuments({ "vendor.email": email }),

      paymentCollection
        .aggregate([
          { $match: { paymentStatus: "paid" } },
          { $addFields: { bookingObjId: { $toObjectId: "$bookingId" } } },
          {
            $lookup: {
              from: "bookings", // adjust if your collection name differs
              localField: "bookingObjId",
              foreignField: "_id",
              as: "booking",
            },
          },
          { $unwind: "$booking" },
          { $match: { "booking.vendor.email": email } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$price" },
              totalSold: { $sum: "$booking.quantity" },
            },
          },
        ])
        .toArray(),
    ]);

    res.status(200).send({
      success: true,
      message: "Vendor revenue stats fetched successfully",
      result: {
        totalTicketsAdded,
        totalTicketsSold: agg[0]?.totalSold || 0,
        totalRevenue: agg[0]?.totalRevenue || 0,
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch revenue stats",
      error: error.message,
    });
  }
});

// GET /api/vendor/monthly-revenue/:email
app.get("/api/vendor/monthly-revenue/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const currentYear = new Date().getFullYear();

    const monthly = await paymentCollection
      .aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: {
              $gte: new Date(`${currentYear}-01-01`),
              $lte: new Date(`${currentYear}-12-31T23:59:59`),
            },
          },
        },
        { $addFields: { bookingObjId: { $toObjectId: "$bookingId" } } },
        {
          $lookup: {
            from: "bookings",
            localField: "bookingObjId",
            foreignField: "_id",
            as: "booking",
          },
        },
        { $unwind: "$booking" },
        { $match: { "booking.vendor.email": email } },
        {
          $group: {
            _id: { $month: "$createdAt" },
            value: { $sum: "$price" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result = monthNames.map((month, idx) => {
      const found = monthly.find((m) => m._id === idx + 1);
      return { month, value: found ? found.value : 0 };
    });

    res.status(200).send({
      success: true,
      message: "Monthly revenue fetched successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch monthly revenue",
      error: error.message,
    });
  }
});

// GET /api/vendor/tickets-by-transport/:email
app.get("/api/vendor/tickets-by-transport/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const results = await paymentCollection
      .aggregate([
        { $match: { paymentStatus: "paid" } },
        { $addFields: { bookingObjId: { $toObjectId: "$bookingId" } } },
        {
          $lookup: {
            from: "bookings",
            localField: "bookingObjId",
            foreignField: "_id",
            as: "booking",
          },
        },
        { $unwind: "$booking" },
        { $match: { "booking.vendor.email": email } },
        {
          $group: {
            _id: "$booking.transportType",
            count: { $sum: "$booking.quantity" },
          },
        },
      ])
      .toArray();

    const total = results.reduce((sum, r) => sum + r.count, 0);

    const colorMap = {
      Bus: "bg-blue-500",
      Train: "bg-green-500",
      Launch: "bg-amber-500",
      Plane: "bg-purple-500",
    };

    const result = results.map((r) => ({
      type: r._id,
      count: r.count,
      percentage: total ? Math.round((r.count / total) * 100) : 0,
      color: colorMap[r._id] || "bg-gray-500",
    }));

    res.status(200).send({
      success: true,
      message: "Tickets by transport fetched successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch transport breakdown",
      error: error.message,
    });
  }
});

// GET /api/vendor/recent-transactions/:email?limit=5
app.get("/api/vendor/recent-transactions/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    const transactions = await paymentCollection
      .aggregate([
        { $match: { paymentStatus: "paid" } },
        { $addFields: { bookingObjId: { $toObjectId: "$bookingId" } } },
        {
          $lookup: {
            from: "bookings",
            localField: "bookingObjId",
            foreignField: "_id",
            as: "booking",
          },
        },
        { $unwind: "$booking" },
        { $match: { "booking.vendor.email": email } },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
      ])
      .toArray();

    const result = transactions.map((t) => ({
      id: `#TH-${t._id.toString().slice(-5).toUpperCase()}`,
      date: new Date(t.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      route: `${t.booking.route.from} → ${t.booking.route.to}`,
      method: "Card", // Stripe payment — swap in real brand if you fetch PaymentIntent details
      status: "Completed",
      amount: t.price,
    }));

    res.status(200).send({
      success: true,
      message: "Recent transactions fetched successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch recent transactions",
      error: error.message,
    });
  }
});



// user  related  apis 

   //1. User books a ticket
app.post("/api/bookings", async (req, res) => {
  try {
    const bookingData = req.body;

    const addData = {
      ...bookingData,
      status: "pending", // pending -> approved -> rejected
      paymentStatus: "unpaid", // unpaid -> paid
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await bookingCollection.insertOne(addData);

    res.status(201).send({
      success: true,
      message: "Booking request sent successfully.",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to create booking.",
      error: error.message,
    });
  }
});

// payment api
app.post("/api/payment", async (req, res) => {
  try {
    const {
      sessionId,
      bookingId,
      userId,
      price,
      paymentIntent,
    } = req.body;

    const isExist = await paymentCollection.findOne({
      sessionId,
    });

    if (isExist) {
      return res.status(200).send({
        success: true,
        message: "Payment already exists",
      });
    }

// iam finding booking for the extra information to save in booking collection
const booking = await bookingCollection.findOne({
  _id: new ObjectId(bookingId),
});

if (!booking) {
  return res.status(404).send({
    success: false,
    message: "Booking not found",
  });
}

    const result = await paymentCollection.insertOne({
      sessionId,
      paymentIntent,
      bookingId,
      userId,
      price,
      paymentStatus: "paid",
      createdAt: new Date(),
    });

    await bookingCollection.updateOne(
      {
        _id: new ObjectId(bookingId),
      },
      {
        $set: {
          paymentStatus: "paid",
          updatedAt: new Date(),
        },
      }
    );

    res.status(200).send({
      success: true,
      message: "Payment Successful",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// Get transaction history of a specific user
app.get("/api/payments/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Parse and sanitize pagination params
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const aggResult = await paymentCollection
      .aggregate([
        // 1. Get only this user's payments
        {
          $match: {
            userId: userId,
          },
        },

        // 2. Join bookings collection
        {
          $lookup: {
            from: "bookings",

            let: {
              bookingId: "$bookingId",
            },

            pipeline: [
              {
                $addFields: {
                  idString: {
                    $toString: "$_id",
                  },
                },
              },
              {
                $match: {
                  $expr: {
                    $eq: ["$idString", "$$bookingId"],
                  },
                },
              },
            ],

            as: "booking",
          },
        },

        // 3. Convert booking array into object
        {
          $unwind: "$booking",
        },

        // 4. Sort newest first
        {
          $sort: {
            createdAt: -1,
          },
        },

        // 5. Shape the fields
        {
          $project: {
            _id: 1,
            sessionId: 1,
            paymentIntent: 1,
            paymentStatus: 1,
            price: 1,
            createdAt: 1,

            bookingId: "$booking._id",
            ticketTitle: "$booking.ticketTitle",
            transportType: "$booking.transportType",
            quantity: "$booking.quantity",
            totalPrice: "$booking.totalPrice",

            route: "$booking.route",
            schedule: "$booking.schedule",

            vendor: "$booking.vendor",
          },
        },

        // 6. Split into paginated data + total count, in one pass
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const result = aggResult[0]?.data || [];
    const totalCount = aggResult[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).send({
      success: true,
      message: "Transaction history fetched successfully.",
      result,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch transaction history.",
      error: error.message,
    });
  }
});
//3. Get all bookings of a specific user
app.get("/api/bookings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const query = {
      "user.email": email,
    };

    const result = await bookingCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Bookings fetched successfully.",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch bookings.",
      error: error.message,
    });
  }
});

app.get("/api/booking/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await bookingCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).send({
        success: false,
        message: "Booking not found",
      });
    }

    res.send({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});



    // Admin related api goes below

    // 1.get all vendor tickets

app.get("/api/admin/tickets", async (req, res) => {
  try {
    // Get pagination params from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await ticketsCollection.countDocuments();

    // Get paginated results
    const result = await ticketsCollection
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.status(200).send({
      success: true,
      message: "Successfully fetched vendor tickets",
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
      message: "Failed to get tickets.",
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

  // count the approved tickets
app.get("/api/tickets/count-active", async (req, res) => {
  try {
    const query = {
      status: "approved",
      isVisible: true,
      advertised: true, // assuming you have this boolean field
    };

    const count = await ticketsCollection.countDocuments(query);

    res.status(200).send({
      success: true,
      count,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch active ad count",
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


// api for searching and filtering and sorting and pagination in all ticket page
app.get("/api/tickets/search", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { status: "approved", isVisible: true };

    if (req.query.from && req.query.from.trim() !== "") {
      query["route.from"] = { $regex: req.query.from, $options: "i" };
    }
    if (req.query.to && req.query.to.trim() !== "") {
      query["route.to"] = { $regex: req.query.to, $options: "i" };
    }

    const validTypes = ["bus", "train", "launch", "flight"];
    if (req.query.transportType && validTypes.includes(req.query.transportType.toLowerCase())) {
      // Use regex for case-insensitive matching
      query.transportType = { $regex: req.query.transportType, $options: "i" };
    }

    let sortOption = { createdAt: -1 };
    if (req.query.sort === "low-high") {
      sortOption = { pricePerSeat: 1 };
    } else if (req.query.sort === "high-low") {
      sortOption = { pricePerSeat: -1 };
    }

    const total = await ticketsCollection.countDocuments(query);
    const result = await ticketsCollection
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .toArray();

    res.status(200).json({ success: true, result, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Search failed", error: error.message });
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
    // api for latest tickets
    app.get("/api/home/latest", async (req, res) => {
      try {
        const query = {
          status: "approved",
          isVisible: true,
        };

        const result = await ticketsCollection
          .find(query)
          .limit(6)
          .sort({ createdAt: -1 })
          .toArray();
        res.status(200).send({
          success: true,
          message: "only latest tickets are fetched",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to fetched latest ticket data",
          error: error.message,
        });
      }
    });
  
app.get("/",async(req,res)=>{
  res.send("hello world");
})
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
  //   // Ensures that the client will close when you finish/errorJ
  //   // await client.close();
  }
}
run().catch(console.dir);
// crate this for deployment
// module.exports=app; 