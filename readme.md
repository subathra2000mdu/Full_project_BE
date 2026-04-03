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

