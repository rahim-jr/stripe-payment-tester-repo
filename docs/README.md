# Stripe Backend API - Postman Documentation

This documentation provides a complete guide to using the Stripe Backend API Postman collection, including JWT authorization setup and sample requests/responses.

## Table of Contents

1. [Importing the Collection](#importing-the-collection)
2. [Environment Setup](#environment-setup)
3. [Stripe Keys Configuration](#stripe-keys-configuration)
4. [JWT Authorization Setup](#jwt-authorization-setup)
5. [Payment Flow Explanation](#payment-flow-explanation)
6. [API Endpoints](#api-endpoints)
7. [End-to-End Testing Guide](#end-to-end-testing-guide)
8. [Sample Workflows](#sample-workflows)
9. [Troubleshooting](#troubleshooting)

## Importing the Collection

### Step 1: Import into Postman

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `Stripe-Backend-API.postman_collection.json`
5. Click **Import**

### Step 2: Set Up Environment Variables

1. Click the **Environments** icon (left sidebar)
2. Click **+** to create a new environment
3. Name it "Stripe Backend Local" (or your preferred name)
4. Add the following variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | `http://localhost:3001` | `http://localhost:3001` |
| `auth_token` | (leave empty) | (will be auto-filled) |
| `user_id` | (leave empty) | (will be auto-filled) |
| `product_id` | (leave empty) | (will be auto-filled) |
| `order_id` | (leave empty) | (will be auto-filled) |

5. Click **Save**
6. Select this environment from the dropdown (top right)

## Environment Setup

### Backend Server Configuration

Ensure your backend server is running with the following environment variables in your `.env` file:

```env
PORT=3001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=http://localhost:3000
```

### Update Base URL

If your server runs on a different port or host, update the `base_url` variable in your Postman environment.

## Stripe Keys Configuration

### Understanding Stripe Keys

Stripe provides two types of keys with different purposes and security boundaries:

### 1️⃣ Publishable Key (`pk_test_...`)

**Purpose:**
- Used only in frontend/client-side code
- Safe to expose publicly
- Identifies your Stripe account, not authority

**What it can do:**
- Initialize Stripe.js
- Redirect user to Checkout
- Create tokens (via Stripe.js)

**What it cannot do:**
- Create charges
- Create checkout sessions
- Access customers, payments, webhooks

**Rule of thumb:** Never use in backend code.

### 2️⃣ Secret Key (`sk_test_...`) ✅ **YOU USE THIS**

**Purpose:**
- Used only on the backend
- **Must never be exposed** (keep in `.env` file)
- Full authority over Stripe resources

**What it can do:**
- Create Checkout Sessions ✅
- Create Payment Intents
- Verify webhooks
- Read/write orders, payments, refunds

**Rule of thumb:** Only use in backend, never commit to Git.

### In This Project

Since this is a **backend-only assignment**:

✅ **You will use ONLY:**
- Secret key (`sk_test_...`) in your `.env` file
- Secret key to create checkout sessions
- Secret key to verify webhook signatures

❌ **You do NOT need:**
- Publishable key (`pk_test_...`)
- Stripe.js
- Frontend integration

**Why?** Because:
- No frontend is required
- No Stripe.js is needed
- You're returning `session.url` from backend (users open it directly)

This design is actually better because:
- Simpler mental model
- Fewer moving parts
- Safer by default
- Matches Stripe Checkout best practice

### Common Mistakes to Avoid

❌ Putting `sk_test_...` in frontend  
❌ Committing keys to GitHub  
❌ Trying to create Checkout Session with publishable key  
❌ Mixing Payment Intents + Checkout unnecessarily

## JWT Authorization Setup

### Automatic Token Management

The Postman collection includes **automatic token management** through test scripts. When you successfully register or login, the JWT token is automatically saved to the `auth_token` environment variable.

### Manual Setup (Alternative)

If you prefer to set the token manually:

1. **Get your JWT token:**
   - Run the **Register** or **Login** request
   - Copy the `token` value from the response

2. **Set the token in Postman:**
   - Go to your environment variables
   - Set `auth_token` to your copied token value
   - Save the environment

### Using JWT in Requests

Most endpoints use **Bearer Token** authentication:

1. The collection automatically uses `{{auth_token}}` for authenticated requests
2. The token is sent in the `Authorization` header as: `Bearer <token>`
3. Token format: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Token Expiration

- JWT tokens expire after **7 days**
- If you receive a `401 Unauthorized` response:
  1. Run the **Login** request again to get a new token
  2. The new token will automatically replace the old one

## Payment Flow Explanation

### End-to-End Payment Flow

Understanding the complete payment flow is crucial for proper implementation:

1. **User registers & logs in**
   - User creates account via `/api/auth/register`
   - User logs in via `/api/auth/login`
   - JWT token is received and stored

2. **User sees a product/plan**
   - User fetches available products via `/api/products`
   - Products are displayed (no authentication required)

3. **User creates an order**
   - User creates order via `/api/orders` with `productId`
   - Order is created with status `"pending"`
   - Order is stored in database

4. **Backend creates Stripe Checkout Session**
   - User calls `/api/orders/checkout-session` with `orderId`
   - Backend uses Stripe secret key to create checkout session
   - Session URL is returned to user
   - **Important:** Order status is still `"pending"` at this point

5. **User completes payment**
   - User opens the checkout session URL in browser
   - User enters test card: `4242 4242 4242 4242`
   - User completes payment on Stripe's hosted page
   - Stripe redirects to `success_url` or `cancel_url`

6. **Stripe calls your webhook**
   - Stripe sends `checkout.session.completed` event
   - Webhook endpoint `/api/webhooks/stripe` receives the event
   - Webhook signature is verified using `STRIPE_WEBHOOK_SECRET`
   - Order ID is extracted from session metadata

7. **Backend updates order status**
   - Order status is updated from `"pending"` to `"paid"`
   - Database is updated asynchronously
   - User can verify via `/api/orders`

### Key Points

- **Order creation** and **payment** are separate steps
- **Webhook is mandatory** - this is how you know payment succeeded
- **Metadata is critical** - orderId must be in session metadata
- **Async flow** - webhook may arrive after user sees success page
- **Status transitions:** `pending` → `paid` (via webhook)

### Why Webhooks Are Mandatory

Webhooks are the **only reliable way** to know when payment succeeds because:
- User might close browser before redirect
- Network issues might prevent redirect
- Payment might be delayed
- Webhooks are guaranteed delivery (with retries)

## API Endpoints

### Health Check

**GET** `/`

Check if the API is running.

**Response:**
```json
{
  "status": "API is running"
}
```

---

### Authentication

#### Register

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Success Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

**Error Responses (400):**
```json
{
  "message": "All fields are required"
}
```
or
```json
{
  "message": "User already exists"
}
```

#### Login

**POST** `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

**Error Response (400):**
```json
{
  "message": "Invalid credentials"
}
```

#### Get Current User

**GET** `/api/auth/me`

Get the currently authenticated user's information.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Products

#### Get All Products

**GET** `/api/products`

Get a list of all available products (no authentication required).

**Success Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Premium Plan",
    "price": 29.99,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Basic Plan",
    "price": 9.99,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Create Product

**POST** `/api/products`

Create a new product (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Premium Plan",
  "price": 29.99
}
```

**Success Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "Premium Plan",
  "price": 29.99,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (400):**
```json
{
  "message": "Name and price required"
}
```

---

### Orders

#### Create Order

**POST** `/api/orders`

Create a new order for a product (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439012"
}
```

**Success Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "user": "507f1f77bcf86cd799439011",
  "product": "507f1f77bcf86cd799439012",
  "amount": 29.99,
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (404):**
```json
{
  "message": "Product not found"
}
```

#### Create Checkout Session

**POST** `/api/orders/checkout-session`

Create a Stripe checkout session for an order (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "507f1f77bcf86cd799439014"
}
```

**Success Response (200):**
```json
{
  "session": {
    "id": "cs_test_a1b2c3d4e5f6...",
    "object": "checkout.session",
    "url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4e5f6...",
    "status": "open",
    "payment_status": "unpaid",
    "mode": "payment",
    "success_url": "http://localhost:3000/success",
    "cancel_url": "http://localhost:3000/cancel",
    "metadata": {
      "orderId": "507f1f77bcf86cd799439014"
    }
  }
}
```

**Error Responses (404):**
```json
{
  "message": "Order not found"
}
```
or
```json
{
  "message": "Product not found for this order"
}
```

#### Get My Orders

**GET** `/api/orders`

Get all orders for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "user": "507f1f77bcf86cd799439011",
    "product": "507f1f77bcf86cd799439012",
    "amount": 29.99,
    "status": "paid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439015",
    "user": "507f1f77bcf86cd799439011",
    "product": "507f1f77bcf86cd799439013",
    "amount": 9.99,
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Webhooks

#### Stripe Webhook

**POST** `/api/webhooks/stripe`

Stripe webhook endpoint (typically called by Stripe, not manually). Requires `stripe-signature` header for verification.

**Headers:**
```
stripe-signature: t=1234567890,v1=signature...
Content-Type: application/json
```

**Note:** This endpoint is typically called by Stripe when payment events occur. Manual testing requires proper Stripe webhook signature verification.

**Success Response (200):**
```json
{
  "received": true
}
```

## End-to-End Testing Guide

### Prerequisites

Before testing, ensure you have:

1. **Stripe CLI installed**
   ```bash
   # Install Stripe CLI from https://stripe.com/docs/stripe-cli
   ```

2. **Stripe account with test mode enabled**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy your test secret key

3. **Environment variables set**
   ```env
   PORT=3001
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   FRONTEND_URL=http://localhost:3000
   ```

### Pre-Flight Check

#### ✅ .env must contain:
- `STRIPE_SECRET_KEY` (starts with `sk_test_`)
- `STRIPE_WEBHOOK_SECRET` (will be set after starting Stripe CLI)
- `FRONTEND_URL` (for redirect URLs)
- `MONGO_URI` (database connection)
- `JWT_SECRET` (for token signing)

#### ✅ Server running
```bash
npm start
# or
npm run dev
```

**Expected:** Server logs show "Server running on http://localhost:3001"

### Step-by-Step Test Flow

#### STEP 1 — Create a Product

**Request:**
```
POST http://localhost:3001/api/products
```

**Headers:**
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Test Product",
  "price": 29.99
}
```

**✅ Expected response:**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "Test Product",
  "price": 29.99,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

👉 **Copy PRODUCT_ID**

#### STEP 2 — Create an Order (status = pending)

**Request:**
```
POST http://localhost:3001/api/orders
```

**Headers:**
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

**Body:**
```json
{
  "productId": "<PRODUCT_ID_FROM_STEP_1>"
}
```

**✅ Expected response:**
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "user": "507f1f77bcf86cd799439011",
  "product": "507f1f77bcf86cd799439012",
  "amount": 29.99,
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

👉 **Copy ORDER_ID**

**This confirms:**
- User → order mapping works
- Stripe not involved yet (correct)

#### STEP 3 — Create Stripe Checkout Session

**Request:**
```
POST http://localhost:3001/api/orders/checkout-session
```

**Headers:**
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

**Body:**
```json
{
  "orderId": "<ORDER_ID_FROM_STEP_2>"
}
```

**✅ Expected response:**
```json
{
  "session": {
    "id": "cs_test_a1b2c3d4e5f6...",
    "object": "checkout.session",
    "url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4e5f6...",
    "status": "open",
    "payment_status": "unpaid",
    "mode": "payment",
    "success_url": "http://localhost:3000/success",
    "cancel_url": "http://localhost:3000/cancel",
    "metadata": {
      "orderId": "507f1f77bcf86cd799439014"
    }
  }
}
```

👉 **Copy the `url`**

**At this moment:**
- Stripe session is created
- Order is still `pending`
- Metadata contains `orderId` (critical)

#### STEP 4 — Start Webhook Listener (MANDATORY)

**Open a new terminal:**

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

**You will see:**
```
> Ready! Your webhook signing secret is whsec_XXXX (^C to quit)
```

⚠️ **VERY IMPORTANT**

**Copy that `whsec_XXXX` and update `.env`:**
```env
STRIPE_WEBHOOK_SECRET=whsec_XXXX
```

**Restart server:**
```bash
# Stop server (Ctrl+C) and restart
npm start
```

**If you skip this → webhook will NOT update order.**

#### STEP 5 — Complete Payment in Browser

1. **Open the Checkout URL** in browser (from Step 3)
2. **Fill card details:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)
3. **Click Pay**

**Stripe will redirect to:**
- `http://localhost:3000/success` (if payment succeeds)
- `http://localhost:3000/cancel` (if user cancels)

**(404 is OK — backend already did its job)**

#### STEP 6 — Verify Webhook Fired

**In Stripe CLI terminal, you MUST see:**
```
2024-01-01 12:00:00  --> checkout.session.completed [200 OK]
```

**This means:**
- Stripe → your server
- Signature verified
- Event accepted

#### STEP 7 — Verify Order Status Updated ✅

**Check order status:**

**Request:**
```
GET http://localhost:3001/api/orders
```

**Headers:**
```
Authorization: Bearer <your_token>
```

**✅ Expected response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "user": "507f1f77bcf86cd799439011",
    "product": "507f1f77bcf86cd799439012",
    "amount": 29.99,
    "status": "paid",  // ← Changed from "pending"
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**This confirms:**
- Metadata → order mapping worked
- Webhook logic is correct
- Async flow handled properly

### Troubleshooting Test Flow

#### ❌ Order still pending

**Possible causes:**
1. Webhook listener not running
2. `STRIPE_WEBHOOK_SECRET` not set or incorrect
3. Webhook endpoint not receiving events
4. Signature verification failing

**Solutions:**
1. Check Stripe CLI is running: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
2. Verify `STRIPE_WEBHOOK_SECRET` in `.env` matches CLI output
3. Check server logs for webhook errors
4. Verify webhook endpoint is accessible

#### ❌ Checkout session creation fails

**Possible causes:**
1. Invalid `STRIPE_SECRET_KEY`
2. Order not found
3. Product not found for order
4. Invalid `FRONTEND_URL`

**Solutions:**
1. Verify `STRIPE_SECRET_KEY` starts with `sk_test_`
2. Ensure order exists and is in database
3. Verify order has valid product reference
4. Check `FRONTEND_URL` is valid URL

#### ❌ Webhook signature verification fails

**Possible causes:**
1. `STRIPE_WEBHOOK_SECRET` mismatch
2. Webhook endpoint not using `express.raw()` middleware
3. Request body modified before verification

**Solutions:**
1. Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe CLI output
2. Verify webhook route uses `express.raw({type: "application/json"})`
3. Check webhook handler receives raw body

## Sample Workflows

### Complete Purchase Flow

1. **Register a new user**
   - Run: `Authentication > Register`
   - Token is automatically saved

2. **Get available products**
   - Run: `Products > Get All Products`
   - Note a `product_id` from the response

3. **Create an order**
   - Run: `Orders > Create Order`
   - Use the `product_id` from step 2
   - Order ID is automatically saved

4. **Create checkout session**
   - Run: `Orders > Create Checkout Session`
   - Use the `order_id` from step 3
   - Copy the `session.url` from the response

5. **Complete payment**
   - Open the `session.url` in a browser
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete the payment

6. **Verify order status**
   - Run: `Orders > Get My Orders`
   - Check that the order status is now `"paid"`

### Product Management Flow

1. **Login**
   - Run: `Authentication > Login`
   - Token is automatically saved

2. **Create a product**
   - Run: `Products > Create Product`
   - Product ID is automatically saved

3. **View all products**
   - Run: `Products > Get All Products`
   - Verify your new product appears in the list

## Troubleshooting

### Common Issues

#### 401 Unauthorized Error

**Problem:** Getting `401 Unauthorized` responses

**Solutions:**
1. Ensure you've run **Register** or **Login** first
2. Check that `auth_token` is set in your environment
3. Verify the token hasn't expired (tokens expire after 7 days)
4. Re-run **Login** to get a fresh token

#### 404 Not Found Error

**Problem:** Endpoint not found

**Solutions:**
1. Verify `base_url` is correct in your environment
2. Ensure your backend server is running
3. Check the endpoint path matches your server configuration

#### Token Not Auto-Saving

**Problem:** Token isn't automatically saved after login/register

**Solutions:**
1. Ensure you're using the correct environment
2. Check that the test scripts are enabled in Postman settings
3. Manually copy the token and set it in environment variables

#### Product/Order ID Not Found

**Problem:** Getting "Product not found" or "Order not found" errors

**Solutions:**
1. Ensure you've created the product/order first
2. Verify the ID is correct (check environment variables)
3. Make sure you're using IDs from your own database, not sample IDs

#### Stripe Checkout Session Errors

**Problem:** Errors when creating checkout sessions

**Solutions:**
1. Verify `STRIPE_SECRET_KEY` is set in your `.env` file (must start with `sk_test_`)
2. Ensure `FRONTEND_URL` is correctly configured
3. Check that the order exists and has a valid product
4. Verify your Stripe API key is valid and active
5. Ensure order has populated product (check `order.product` is not null)

#### Webhook Not Updating Order

**Problem:** Payment completes but order status remains "pending"

**Solutions:**
1. **Check Stripe CLI is running:**
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```

2. **Verify webhook secret:**
   - Copy `whsec_XXXX` from Stripe CLI output
   - Update `.env` with `STRIPE_WEBHOOK_SECRET=whsec_XXXX`
   - Restart server

3. **Check webhook endpoint:**
   - Verify route uses `express.raw({type: "application/json"})`
   - Ensure webhook handler is properly implemented
   - Check server logs for webhook errors

4. **Verify metadata:**
   - Ensure checkout session includes `metadata.orderId`
   - Verify orderId matches actual order in database

5. **Check webhook signature verification:**
   - Ensure `stripe.webhooks.constructEvent()` is used
   - Verify signature header is passed correctly

### Testing Tips

1. **Use Postman's Collection Runner:**
   - Select the collection
   - Click "Run"
   - Execute requests in sequence

2. **Monitor Environment Variables:**
   - Keep the environment panel open
   - Watch variables update automatically
   - Manually verify values if needed

3. **Check Response Status:**
   - Green (2xx) = Success
   - Yellow (4xx) = Client Error (check request)
   - Red (5xx) = Server Error (check backend logs)

4. **Use Postman Console:**
   - View → Show Postman Console
   - See detailed request/response information
   - Debug authentication issues

## Additional Resources

- [Postman Documentation](https://learning.postman.com/docs/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [JWT.io - JWT Debugger](https://jwt.io/)

## Quick Reference

### Test Card Numbers

Use these test cards in Stripe Checkout:

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |

**Test Card Details:**
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

### Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/stripe-db` |
| `JWT_SECRET` | Secret for JWT signing | `your-secret-key` |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode) | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...` (from Stripe CLI) |
| `FRONTEND_URL` | Frontend URL for redirects | `http://localhost:3000` |

### Order Status Flow

```
pending → paid (via webhook)
```

- **pending:** Order created, payment not completed
- **paid:** Payment completed, webhook received and processed
- **failed:** Payment failed (if implemented)

---

**Last Updated:** 2024
