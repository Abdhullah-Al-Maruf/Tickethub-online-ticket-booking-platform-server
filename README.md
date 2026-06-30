# 🎫 TicketHub - Online Ticket Booking Platform (Server)

The backend server for **TicketHub**, a full-stack online ticket booking platform where users can search, book, and manage tickets for buses, trains, flights, and ships. This RESTful API is built with **Node.js**, **Express.js**, and **MongoDB**, providing secure authentication, role-based authorization, booking management, payment integration, and admin/vendor functionalities.

---

## 🚀 Live API

> https://ticket-hub-server-seven.vercel.app/

---

## 🔗 Client Repository

Frontend Repository:
https://github.com/Abdhullah-Al-Maruf/Tickethub-online-ticket-booking-platform-client

---

## ✨ Features

### Authentication
- User Registration & Login
- Better Auth Authentication
- JWT Protected Routes
- Role-based Authorization
- Secure Cookie Authentication

### User
- View Profile
- Update Profile
- Search Tickets
- Book Tickets
- View Booking History
- Cancel Booking
- Payment Integration

### Vendor
- Create Tickets
- Update Tickets
- Delete Tickets
- Manage Bookings
- View Ticket Statistics
- Advertise Tickets

### Admin
- Manage Users
- Manage Vendors
- Approve Vendor Requests
- Manage Advertisements
- Manage All Tickets
- Monitor Bookings
- Block/Unblock Users
- Fraud Detection

### Booking System
- Seat Availability Check
- Seat Reservation
- Booking Status Tracking
- Payment Verification
- Booking Cancellation

---

# 🛠 Tech Stack

- Node.js
- Express.js
- MongoDB
- Better Auth
- JWT
- Cookie Parser
- CORS
- Dotenv

---

# 📁 Folder Structure

```
server
│
├── middleware
├── routes
├── utils
├── config
├── database
├── index.js
├── package.json
└── .env
```

---

# ⚙️ Environment Variables

Create a `.env` file in the root directory.

```env
PORT=5000

MONGODB_URI=your_mongodb_uri

DB_NAME=TicketHub

BETTER_AUTH_SECRET=your_secret

BETTER_AUTH_URL=http://localhost:5000

JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:3000
```

---

# 📦 Installation

Clone the repository

```bash
git clone https://github.com/Abdhullah-Al-Maruf/Tickethub-online-ticket-booking-platform-server.git
```

Move into the project

```bash
cd Tickethub-online-ticket-booking-platform-server
```

Install dependencies

```bash
npm install
```

Run the development server

```bash
npm run dev
```

Production

```bash
npm start
```

---

# 📌 API Endpoints

## Authentication

```
POST    /api/auth/register
POST    /api/auth/login
POST    /api/auth/logout
GET     /api/auth/session
```

---

## Users

```
GET     /api/users
GET     /api/users/:id
PATCH   /api/users/:id
DELETE  /api/users/:id
```

---

## Tickets

```
GET     /api/tickets
GET     /api/tickets/:id
POST    /api/tickets
PATCH   /api/tickets/:id
DELETE  /api/tickets/:id
```

---

## Bookings

```
GET     /api/bookings
POST    /api/bookings
PATCH   /api/bookings/:id
DELETE  /api/bookings/:id
```

---

## Admin

```
GET     /api/admin/users
GET     /api/admin/tickets
PATCH   /api/admin/users/:id/fraud
PATCH   /api/admin/users/:id/unfraud
PATCH   /api/admin/vendors/:id/approve
```

---

## Vendor

```
GET     /api/vendor/tickets
POST    /api/vendor/tickets
PATCH   /api/vendor/tickets/:id
DELETE  /api/vendor/tickets/:id
```

---

# 🔒 Security

- JWT Authentication
- Better Auth
- HTTP Only Cookies
- Role-Based Authorization
- CORS Protection
- Environment Variables
- Input Validation
- MongoDB ObjectId Validation

---

# 📈 Future Improvements

- Email Notifications
- Ticket QR Code
- Stripe Payment
- Refund System
- Live Seat Selection
- Ticket Reviews
- Push Notifications
- Analytics Dashboard

---

# 👨‍💻 Author

**Md Abdullah Al Maruf**

GitHub:
https://github.com/Abdhullah-Al-Maruf

---

# 📄 License

This project is licensed under the MIT License.

---

⭐ If you like this project, don't forget to give it a star!
