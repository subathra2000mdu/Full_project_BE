# Flight Booking & Reservation System (Backend)

**Postman API Documentation:**(https://documenter.getpostman.com/view/5287919/2sBXionAXS)]

## 1. Introduction

This repository contains the backend service for a robust Flight Booking and Reservation platform. It is built using the ME(R)N stack (MongoDB, Express.js, Node.js) and is designed to handle user authentication, flight searching, pending reservations, secure payment simulation, and itinerary generation.

The core service facilitates the flow of data from flight availability to final booking confirmation, ensuring transactional integrity and user-specific data access.

## 2. Technical Stack

* **Runtime Environment:** Node.js
* **Web Framework:** Express.js
* **Database:** MongoDB
* **ORM/ODM:** Mongoose
* **Authentication:** JSON Web Tokens (JWT) & Bcrypt
* **Payment Simulation:** Internal logic (Mocked Gateway)
* **Key Utilities:**
    * `jsPDF` & `jspdf-autotable`: For automated PDF itinerary generation.
    * `Nodemailer`: For automated transaction email notifications.
    * `Dotenv`: For secure environment variable management.

## 3. Modular Architecture

The backend follows a strict Model-View-Controller (MVC) design pattern for maintainability and scalability, as reflected in the project structure:

* **`/controllers`**: Contains the business logic for each feature (e.g., handling a booking request, processing a login).
* **`/models`**: Defines the database schemas for users, flights, and bookings using Mongoose.
* **`/routers`**: maps incoming API endpoints to their respective controller functions.
* **`/middleware`**: Houses authentication and error-handling functions that process requests before they reach the controllers.
* **`/utils`**: Contains reusable utility services, such as PDF generation and Email services.

## 4. Feature Details

### A. Authentication Module
Secures user access across the platform.
* Handles secure user registration and login.
* Implements password hashing using Bcrypt.
* Uses a `checkAuth` middleware to validate JWTs, protecting booking and history routes.

### B. Flight Search
Provides access to scheduled flight data.
* API: `GET /api/auth/flights/search`
* Logic: Queries the MongoDB `flights` collection based on 'From', 'To', and 'Date' parameters. It filters results to show only active flights with available seating.

### C. Reservation Logic (The Booking Flow)
Manages the process of securing a seat.
* **API (Pending Reservation):** `POST /api/auth/bookings/reserve`
* **Logic:** A protected route that captures passenger details and links them to a specific flight ID. It creates a booking record with a status of "Pending" and returns a unique `bookingReference`.

### D. Payments Module (Mocked Gateway)
Handles simulated transaction confirmation.
* **APIs:** `POST /api/payments/create-intent` & `POST /api/payments/confirm`
* **Logic:** Creates a payment intent and subsequently validates its completion (in development mode). Upon confirmation, it updates the database booking record status to "Completed".

### E. Post-Booking Automation
Automates actions after successful payment.
* **Logic:** Upon payment confirmation, the controller automatically calls the PDF utility service and the Nodemailer utility.
* **Outcome:** A confirmation email is sent to the passenger containing an attached PDF of their official flight itinerary.

# Razorpay Setup Guide
# Complete steps: account → API keys → install → env vars → deploy

## STEP 1 — Create Razorpay Account (Free)
1. Go to https://dashboard.razorpay.com/signup
2. Enter your name, email, password → click "Create account"
3. Verify your email
4. You are now in TEST MODE by default (no KYC needed for test mode)

## STEP 2 — Get Test API Keys
1. Log into https://dashboard.razorpay.com
2. Make sure you are in TEST MODE (toggle at top of dashboard)
3. Go to:  Settings → API Keys → Generate Key
4. A popup shows your KEY ID and KEY SECRET
5. DOWNLOAD or COPY both — the secret is shown only ONCE
   - Key ID looks like:      rzp_test_XXXXXXXXXXXXXXXX
   - Key Secret looks like:  XXXXXXXXXXXXXXXXXXXXXXXX

## STEP 3 — Install Razorpay in VS Code (Backend)
Open your backend folder in VS Code terminal and run:

   cd Final_project_BE
   npm install razorpay

Verify it installed:
   cat package.json | grep razorpay
   # should show: "razorpay": "^2.x.x"

## STEP 4 — Add to .env file (Local Development)

Add these to your backend .env file:
   RAZORPAY_KEY_ID     = rzp_test_XXXXXXXXXXXXXXXX
   RAZORPAY_KEY_SECRET = XXXXXXXXXXXXXXXXXXXXXXXX

Your full .env should look like:
   MONGODB_URI        = mongodb+srv://...
   PORT               = 3001
   JWT_SECRET         = mysupersecretkey
   EMAIL_USER         = subathra2000mdu@gmail.com
   EMAIL_PASS         = mvpcuzanryuoljrc
   CANCELLATION_RATE  = 50
   NODE_ENV           = production
   RAZORPAY_KEY_ID    = rzp_test_XXXXXXXXXXXXXXXX
   RAZORPAY_KEY_SECRET= XXXXXXXXXXXXXXXXXXXXXXXX

## STEP 5 — Add to Render Dashboard (Production)
1. Go to https://dashboard.render.com
2. Click your backend service
3. Go to: Environment → Environment Variables
4. Add:
   Key:   RAZORPAY_KEY_ID      Value: rzp_test_XXXXXXXXXXXXXXXX
   Key:   RAZORPAY_KEY_SECRET  Value: XXXXXXXXXXXXXXXXXXXXXXXX
5. Click "Save Changes" — Render auto-redeploys

## STEP 6 — Add to Netlify (Frontend — NOT needed)
Razorpay Key ID goes to frontend via the backend API response.
The backend sends keyId in the /payments/create-intent response.
Frontend reads it from there. No Netlify env var needed.

## STEP 7 — Files to Replace
Backend:
   controllers/paymentController.js  ← new Razorpay version
   controllers/bookingController.js  ← fixed autoTable + new Flight schema support

Frontend:
   src/Pages/PaymentPage.jsx         ← new Razorpay popup version

## TEST CARD NUMBERS (Test Mode)
   Card Number: 4111 1111 1111 1111
   Expiry:      Any future date (e.g. 12/27)
   CVV:         Any 3 digits (e.g. 123)
   Name:        Any name

   UPI Test ID: success@razorpay  (succeeds)
   UPI Test ID: failure@razorpay  (fails — to test error flow)

## HOW THE FLOW WORKS
1. User clicks "Book Now" → BookingPage saves booking with status "Pending"
2. User goes to PaymentPage → frontend calls POST /payments/create-intent
3. Backend creates Razorpay order → returns { orderId, keyId, amount }
4. Frontend opens Razorpay popup with orderId + keyId
5. User pays → Razorpay calls handler() with payment IDs + signature
6. Frontend sends IDs to POST /payments/confirm
7. Backend verifies signature with crypto.createHmac → marks booking "Completed"
8. Email sent to passenger → PDF downloaded → redirect to History

## GOING LIVE (When ready for real payments)
1. Complete Razorpay KYC at: dashboard.razorpay.com → Settings → Business Details
2. Switch to LIVE MODE on dashboard
3. Generate LIVE API keys (Settings → API Keys → Live Mode)
4. Replace rzp_test_... keys with rzp_live_... keys in Render env vars
5. No code changes needed — the same code works for both test and live