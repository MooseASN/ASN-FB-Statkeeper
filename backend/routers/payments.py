"""
Stripe Payment Integration Router
Handles subscription payments (monthly and annual plans)
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/payments", tags=["payments"])

# MongoDB connection - will be set by main app
db = None

def set_db(database):
    """Set the database connection from main app"""
    global db
    db = database

# ============ SUBSCRIPTION PACKAGES ============
# Define fixed packages on backend - never accept amounts from frontend
SUBSCRIPTION_PACKAGES = {
    # Bronze tier is free - no Stripe checkout needed
    "monthly_bronze": {
        "name": "Bronze",
        "amount": 0,
        "currency": "usd",
        "interval": "month",
        "tier": "bronze",
        "features": [
            "Unlimited teams & games",
            "Unlimited game history",
            "PDF box scores",
            "Simple + Advanced stat tracking",
            "Play-by-play logging"
        ]
    },
    "monthly_silver": {
        "name": "Silver",
        "amount": 15.00,
        "currency": "usd",
        "interval": "month",
        "tier": "silver",
        "features": [
            "Everything in Bronze",
            "Public live stats pages",
            "Embed widgets",
            "5 sponsor banner slots",
            "Season stats & leaderboards",
            "CSV export"
        ]
    },
    "monthly_gold": {
        "name": "Gold", 
        "amount": 20.00,
        "currency": "usd",
        "interval": "month",
        "tier": "gold",
        "features": [
            "Everything in Silver",
            "Shared access (invite staff)",
            "Custom branding on live stats",
            "White-label embeds",
            "Unlimited sponsor banners",
            "Custom team logos",
            "Priority support"
        ]
    },
    # Annual plans (2 months free)
    "annual_silver": {
        "name": "Silver Annual",
        "amount": 150.00,  # $15 x 10 months (2 months free)
        "currency": "usd",
        "interval": "year",
        "tier": "silver",
        "features": [
            "Everything in Bronze",
            "Public live stats pages",
            "Embed widgets",
            "5 sponsor banner slots",
            "Season stats & leaderboards",
            "CSV export"
        ]
    },
    "annual_gold": {
        "name": "Gold Annual",
        "amount": 200.00,  # $20 x 10 months (2 months free)
        "currency": "usd",
        "interval": "year",
        "tier": "gold",
        "features": [
            "Everything in Silver",
            "Shared access (invite staff)",
            "Custom branding on live stats",
            "White-label embeds",
            "Unlimited sponsor banners",
            "Custom team logos",
            "Priority support"
        ]
    }
}

# ============ REQUEST/RESPONSE MODELS ============

class CreateCheckoutRequest(BaseModel):
    package_id: str = Field(..., description="ID of the subscription package")
    origin_url: str = Field(..., description="Frontend origin URL for success/cancel redirects")
    user_id: Optional[str] = Field(None, description="User ID for tracking")
    user_email: Optional[str] = Field(None, description="User email for tracking")

class CheckoutResponse(BaseModel):
    url: str = Field(..., description="Stripe checkout URL")
    session_id: str = Field(..., description="Checkout session ID")

class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    amount_total: int
    currency: str
    package_id: Optional[str] = None
    subscription_active: bool = False

# ============ HELPER FUNCTIONS ============

async def get_current_user_from_request(request: Request):
    """Get user from session token if available"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token or not db:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

# ============ PAYMENT ENDPOINTS ============

@router.get("/packages")
async def get_subscription_packages():
    """Get all available subscription packages"""
    return {"packages": SUBSCRIPTION_PACKAGES}

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: Request,
    checkout_data: CreateCheckoutRequest
):
    """Create a Stripe checkout session for a subscription package"""
    
    # Validate package exists
    if checkout_data.package_id not in SUBSCRIPTION_PACKAGES:
        raise HTTPException(status_code=400, detail=f"Invalid package: {checkout_data.package_id}")
    
    package = SUBSCRIPTION_PACKAGES[checkout_data.package_id]
    
    # Get Stripe API key
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Build webhook URL
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    # Initialize Stripe checkout
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Build success and cancel URLs from frontend origin
    origin = checkout_data.origin_url.rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/pricing"
    
    # Get user info if available
    user = await get_current_user_from_request(request)
    user_id = checkout_data.user_id or (user.get("user_id") if user else None)
    user_email = checkout_data.user_email or (user.get("email") if user else None)
    
    # Create metadata for tracking
    metadata = {
        "package_id": checkout_data.package_id,
        "package_name": package["name"],
        "interval": package["interval"],
        "source": "web_checkout"
    }
    if user_id:
        metadata["user_id"] = user_id
    if user_email:
        metadata["user_email"] = user_email
    
    try:
        # Create checkout session request
        checkout_request = CheckoutSessionRequest(
            amount=float(package["amount"]),  # Keep as float for Stripe
            currency=package["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        # Create the checkout session
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record BEFORE redirect
        if db:
            transaction_doc = {
                "session_id": session.session_id,
                "user_id": user_id,
                "user_email": user_email,
                "package_id": checkout_data.package_id,
                "package_name": package["name"],
                "amount": package["amount"],
                "currency": package["currency"],
                "interval": package["interval"],
                "status": "initiated",
                "payment_status": "pending",
                "metadata": metadata,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.payment_transactions.insert_one(transaction_doc)
            logger.info(f"Created payment transaction: {session.session_id}")
        
        return CheckoutResponse(url=session.url, session_id=session.session_id)
        
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@router.get("/status/{session_id}", response_model=PaymentStatusResponse)
async def get_payment_status(session_id: str, request: Request):
    """Get the status of a payment session"""
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Initialize Stripe checkout
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        # Get checkout status from Stripe
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Find transaction in our database
        transaction = None
        if db:
            transaction = await db.payment_transactions.find_one(
                {"session_id": session_id},
                {"_id": 0}
            )
        
        # Update transaction status if payment is complete and not already processed
        if db and transaction and checkout_status.payment_status == "paid":
            if transaction.get("payment_status") != "paid":
                # Update the transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "status": "complete",
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Activate subscription for user
                user_id = transaction.get("user_id")
                if user_id:
                    subscription_end = datetime.now(timezone.utc)
                    interval = transaction.get("interval", "month")
                    if interval == "year":
                        from datetime import timedelta
                        subscription_end = subscription_end + timedelta(days=365)
                    else:
                        from datetime import timedelta
                        subscription_end = subscription_end + timedelta(days=30)
                    
                    await db.users.update_one(
                        {"user_id": user_id},
                        {"$set": {
                            "subscription_status": "active",
                            "subscription_package": transaction.get("package_id"),
                            "subscription_start": datetime.now(timezone.utc).isoformat(),
                            "subscription_end": subscription_end.isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    logger.info(f"Activated subscription for user: {user_id}")
        
        elif db and transaction and checkout_status.status == "expired":
            if transaction.get("status") != "expired":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "status": "expired",
                        "payment_status": "expired",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return PaymentStatusResponse(
            status=checkout_status.status,
            payment_status=checkout_status.payment_status,
            amount_total=checkout_status.amount_total,
            currency=checkout_status.currency,
            package_id=checkout_status.metadata.get("package_id") if checkout_status.metadata else None,
            subscription_active=checkout_status.payment_status == "paid"
        )
        
    except Exception as e:
        logger.error(f"Failed to get payment status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get payment status: {str(e)}")

@router.get("/my-subscription")
async def get_my_subscription(request: Request):
    """Get current user's subscription status"""
    user = await get_current_user_from_request(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "subscription_status": user.get("subscription_status", "none"),
        "subscription_package": user.get("subscription_package"),
        "subscription_start": user.get("subscription_start"),
        "subscription_end": user.get("subscription_end"),
        "is_active": user.get("subscription_status") == "active"
    }

@router.get("/history")
async def get_payment_history(request: Request):
    """Get current user's payment history"""
    user = await get_current_user_from_request(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not db:
        return {"transactions": []}
    
    transactions = await db.payment_transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"transactions": transactions}
