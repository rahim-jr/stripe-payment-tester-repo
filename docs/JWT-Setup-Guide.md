# JWT Authorization Setup - Quick Guide

## Quick Start

### 1. Import Collection
- Open Postman → Import → Select `Stripe-Backend-API.postman_collection.json`

### 2. Create Environment
- Click **Environments** → **+** → Name: "Stripe Backend Local"
- Add variable: `base_url` = `http://localhost:5000`
- Save and select the environment

### 3. Get JWT Token (Automatic)

**Option A: Register (New User)**
1. Run: `Authentication > Register`
2. Token automatically saved to `auth_token` variable 

**Option B: Login (Existing User)**
1. Run: `Authentication > Login`
2. Token automatically saved to `auth_token` variable 

### 4. Use Authenticated Endpoints
- All protected endpoints automatically use `{{auth_token}}`
- No manual setup needed!

---

## How It Works

### Automatic Token Management

The collection includes **test scripts** that run after Register/Login:

```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("auth_token", response.token);
    pm.environment.set("user_id", response.user.id);
}
```

This automatically:
- Extracts the token from the response
- Saves it to `auth_token` environment variable
- Makes it available for all subsequent requests

### Bearer Token Format

Authenticated requests use:
```
Authorization: Bearer <token>
```

The collection automatically adds this header using `{{auth_token}}`.

---

## Manual Token Setup (If Needed)

If automatic setup doesn't work:

1. **Get Token:**
   - Run Register or Login
   - Copy the `token` value from response

2. **Set Manually:**
   - Environments → Your Environment
   - Edit `auth_token` variable
   - Paste your token
   - Save

---

## Token Expiration

- **Expires:** 7 days
- **Refresh:** Run Login again to get a new token
- **Auto-refresh:** Token automatically updates when you login

---

## Testing Authentication

### Verify Token is Set:
1. Check environment variables panel
2. `auth_token` should have a value like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Test Protected Endpoint:
1. Run: `Authentication > Get Current User`
2. Should return your user info (not 401 error)

### If You Get 401:
1. Token may be expired → Run Login again
2. Token not set → Check environment variables
3. Wrong environment selected → Select correct environment

---

## Endpoints Requiring Authentication

✅ **Require JWT Token:**
- `GET /api/auth/me`
- `POST /api/products` (Create Product)
- `POST /api/orders` (Create Order)
- `POST /api/orders/checkout-session`
- `GET /api/orders` (Get My Orders)

❌ **No Authentication Required:**
- `GET /` (Health Check)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products` (Get All Products)
- `POST /api/webhooks/stripe` (Uses Stripe signature, not JWT)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Run Login/Register to get token |
| Token not saving | Check environment is selected |
| Token expired | Run Login again (tokens expire after 7 days) |
| Wrong user data | Clear `auth_token` and login again |

---

**Pro Tip:** Use Postman's **Collection Runner** to execute the full flow:
1. Register → 2. Get Products → 3. Create Order → 4. Checkout
