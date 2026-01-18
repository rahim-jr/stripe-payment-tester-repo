# Payment Flow Testing Guide

This guide provides step-by-step instructions for testing the complete Stripe payment flow end-to-end.

## Prerequisites

1. **Stripe CLI installed**
   ```bash
   # Install from https://stripe.com/docs/stripe-cli
   # Verify installation:
   stripe --version
   ```

2. **Stripe test account**
   - Sign up at https://dashboard.stripe.com/register
   - Get your test secret key from https://dashboard.stripe.com/test/apikeys

3. **Backend server running**
   ```bash
   npm start
   # Server should be running on http://localhost:3001
   ```

## Setup Stripe CLI Webhook Listener

### Step 1: Start Webhook Listener

Open a **new terminal** and run:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

**Expected output:**
```
> Ready! Your webhook signing secret is whsec_XXXX (^C to quit)
```

### Step 2: Update Environment Variables

**Copy the `whsec_XXXX` value** and add it to your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_XXXX
```

### Step 3: Restart Server

Restart your backend server to load the new webhook secret:

```bash
# Stop server (Ctrl+C) and restart
npm start
```

⚠️ **Important:** The webhook listener must be running before you test payments. Without it, orders will not update from "pending" to "paid".

## Complete Test Flow

### Step 1: Register/Login

**Request:**
```http
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

👉 **Save the token** for subsequent requests.

### Step 2: Create a Product

**Request:**
```http
POST http://localhost:3001/api/products
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "name": "Test Product",
  "price": 29.99
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "Test Product",
  "price": 29.99,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

👉 **Save the `_id`** as `PRODUCT_ID`.

### Step 3: Create an Order

**Request:**
```http
POST http://localhost:3001/api/orders
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "productId": "<PRODUCT_ID>"
}
```

**Response:**
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

✅ **Verify:** Status is `"pending"`  
👉 **Save the `_id`** as `ORDER_ID`.

### Step 4: Create Checkout Session

**Request:**
```http
POST http://localhost:3001/api/orders/checkout-session
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "orderId": "<ORDER_ID>"
}
```

**Response:**
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

✅ **Verify:**
- `url` is present
- `metadata.orderId` matches your `ORDER_ID`
- `payment_status` is `"unpaid"`

👉 **Copy the `url`** value.

### Step 5: Complete Payment

1. **Open the checkout URL** in your browser (from Step 4)

2. **Fill in test card details:**
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/34`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **ZIP:** Any 5 digits (e.g., `12345`)

3. **Click "Pay"**

4. **Stripe will redirect:**
   - Success: `http://localhost:3000/success` (404 is OK)
   - Cancel: `http://localhost:3000/cancel` (if you cancel)

### Step 6: Verify Webhook Received

**Check your Stripe CLI terminal.** You should see:

```
2024-01-01 12:00:00  --> checkout.session.completed [200 OK]
```

✅ **This confirms:**
- Stripe sent webhook to your server
- Signature was verified
- Event was accepted

### Step 7: Verify Order Status Updated

**Request:**
```http
GET http://localhost:3001/api/orders
Authorization: Bearer <your_token>
```

**Response:**
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

✅ **Success!** Order status changed from `"pending"` to `"paid"`.

## Troubleshooting

### Order Still Pending After Payment

**Checklist:**

1. ✅ Is Stripe CLI running?
   ```bash
   # Should see: "Ready! Your webhook signing secret is..."
   ```

2. ✅ Is `STRIPE_WEBHOOK_SECRET` set correctly?
   ```bash
   # Check .env file has: STRIPE_WEBHOOK_SECRET=whsec_XXXX
   # Must match the value from Stripe CLI
   ```

3. ✅ Did you restart server after setting webhook secret?
   ```bash
   # Stop and restart: npm start
   ```

4. ✅ Check server logs for webhook errors
   ```bash
   # Look for webhook-related errors in console
   ```

5. ✅ Verify webhook endpoint is accessible
   ```bash
   # Test: curl http://localhost:3001/api/webhooks/stripe
   ```

### Webhook Not Received

**Possible causes:**

1. **Stripe CLI not running**
   - Solution: Start `stripe listen --forward-to localhost:3001/api/webhooks/stripe`

2. **Wrong webhook secret**
   - Solution: Copy exact `whsec_XXXX` from Stripe CLI output

3. **Server not accessible**
   - Solution: Ensure server is running and accessible on port 3001

4. **Webhook endpoint error**
   - Solution: Check server logs for errors in webhook handler

### Checkout Session Creation Fails

**Common errors:**

1. **"Invalid API Key"**
   - Solution: Verify `STRIPE_SECRET_KEY` in `.env` starts with `sk_test_`

2. **"Order not found"**
   - Solution: Ensure order exists and `orderId` is correct

3. **"Product not found for this order"**
   - Solution: Verify order has valid product reference (use `.populate()`)

## Test Card Numbers

| Card Number | Result | Use Case |
|-------------|--------|----------|
| `4242 4242 4242 4242` | ✅ Success | Normal payment flow |
| `4000 0000 0000 0002` | ❌ Declined | Test error handling |
| `4000 0000 0000 9995` | ❌ Insufficient funds | Test error handling |

**All test cards:**
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

## Quick Reference

### Environment Variables Needed

```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/stripe-db
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe CLI
FRONTEND_URL=http://localhost:3000
```

### Order Status States

- **pending:** Order created, payment not completed
- **paid:** Payment completed, webhook processed
- **failed:** Payment failed (if implemented)

### Payment Flow Summary

```
User → Register/Login → Create Product → Create Order (pending) 
→ Create Checkout Session → Complete Payment → Webhook Fires 
→ Order Updated (paid)
```

---

**Last Updated:** 2024
