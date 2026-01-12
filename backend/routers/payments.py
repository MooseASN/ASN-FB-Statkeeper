"""
Stripe Payment Integration Router
Handles subscription payments (monthly and annual plans) with trial periods
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import stripe

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest
)

logger = logging.getLogger(__name__)

# Primary admin emails - these get full access
PRIMARY_ADMIN_EMAILS = ["antlersportsnetwork@gmail.com", "jared@antlersn.com"]

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
        "trial_days": 0,
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
        "trial_days": 14,
        "features": [
            "Everything in Bronze",
            "Public live stats pages",
            "Embed widgets",
            "5 sponsor banner slots",
            "CSV export"
        ]
    },
    "monthly_gold": {
        "name": "Gold", 
        "amount": 20.00,
        "currency": "usd",
        "interval": "month",
        "tier": "gold",
        "trial_days": 14,
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
        "trial_days": 14,
        "features": [
            "Everything in Bronze",
            "Public live stats pages",
            "Embed widgets",
            "5 sponsor banner slots",
            "CSV export"
        ]
    },
    "annual_gold": {
        "name": "Gold Annual",
        "amount": 200.00,  # $20 x 10 months (2 months free)
        "currency": "usd",
        "interval": "year",
        "tier": "gold",
        "trial_days": 14,
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
    
    if not session_token or db is None:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

# ============ PAYMENT ENDPOINTS ============

@router.get("/user-tier")
async def get_user_tier(request: Request):
    """Get the current user's subscription tier and status"""
    user = await get_current_user_from_request(request)
    
    if not user:
        return {
            "tier": "bronze",
            "subscription_status": None,
            "subscription_end": None,
            "is_trial": False,
            "is_admin": False
        }
    
    # Check if user is a primary admin by email
    user_email = user.get("email", "").lower()
    is_primary_admin = user_email in [e.lower() for e in PRIMARY_ADMIN_EMAILS]
    
    # Get user's subscription info from database
    if db is not None:
        user_doc = await db.users.find_one(
            {"user_id": user["user_id"]},
            {"_id": 0, "subscription_tier": 1, "subscription_status": 1, 
             "subscription_end": 1, "subscription_package": 1, "tier": 1, "role": 1,
             "is_comped": 1}
        )
        
        if user_doc:
            # Check if user is an admin (by role or primary admin list)
            is_admin = user_doc.get("role") == "admin" or is_primary_admin
            is_comped = user_doc.get("is_comped", False)
            
            # Determine tier from various fields
            tier = user_doc.get("subscription_tier") or user_doc.get("tier")
            if not tier and user_doc.get("subscription_package"):
                package_id = user_doc.get("subscription_package", "")
                if "gold" in package_id:
                    tier = "gold"
                elif "silver" in package_id:
                    tier = "silver"
                else:
                    tier = "bronze"
            
            # Admins and comped users get Gold tier features
            effective_tier = tier or "bronze"
            if is_admin or is_comped:
                effective_tier = "gold"
            
            return {
                "tier": effective_tier,
                "actual_tier": tier or "bronze",  # The user's real subscription tier
                "subscription_status": user_doc.get("subscription_status"),
                "subscription_end": user_doc.get("subscription_end"),
                "is_trial": user_doc.get("subscription_status") == "trialing",
                "is_admin": is_admin,
                "is_comped": is_comped
            }
    
    # If no user doc but is primary admin, still grant gold
    if is_primary_admin:
        return {
            "tier": "gold",
            "actual_tier": "bronze",
            "subscription_status": None,
            "subscription_end": None,
            "is_trial": False,
            "is_admin": True,
            "is_comped": False
        }
    
    return {
        "tier": "bronze",
        "subscription_status": None,
        "subscription_end": None,
        "is_trial": False,
        "is_admin": False,
        "is_comped": False
    }

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
    
    # Handle free tier (Bronze) - no Stripe checkout needed
    if package["amount"] == 0:
        # Get user info if available
        user = await get_current_user_from_request(request)
        user_id = checkout_data.user_id or (user.get("user_id") if user else None)
        
        if user_id and db:
            # Update user to bronze tier immediately
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "subscription_status": "active",
                    "subscription_package": checkout_data.package_id,
                    "subscription_tier": package.get("tier", "bronze"),
                    "subscription_start": datetime.now(timezone.utc).isoformat(),
                    "subscription_end": None,  # Free tier doesn't expire
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"Activated free bronze tier for user: {user_id}")
        
        # Return a dummy response - frontend will handle this
        origin = checkout_data.origin_url.rstrip("/")
        return CheckoutResponse(
            url=f"{origin}/select-sport",  # Redirect to app
            session_id="free_tier_no_checkout"
        )
    
    # Get Stripe API key for paid tiers
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
        "tier": package.get("tier", "unknown"),
        "source": "web_checkout"
    }
    if user_id:
        metadata["user_id"] = user_id
    if user_email:
        metadata["user_email"] = user_email
    
    try:
        # Get trial days from package
        trial_days = package.get("trial_days", 0)
        
        # Use Stripe directly for subscription mode with trial periods
        stripe.api_key = stripe_api_key
        
        # Create a Stripe Product and Price on-the-fly or use price_data
        session_params = {
            "payment_method_types": ["card"],
            "mode": "subscription",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": metadata,
            "line_items": [{
                "price_data": {
                    "currency": package["currency"],
                    "product_data": {
                        "name": f"StatMoose {package['name']} Plan",
                        "description": f"{'Monthly' if package['interval'] == 'month' else 'Annual'} subscription to StatMoose {package['tier'].capitalize()} tier"
                    },
                    "unit_amount": int(package["amount"] * 100),  # Convert to cents
                    "recurring": {
                        "interval": package["interval"]
                    }
                },
                "quantity": 1
            }]
        }
        
        # Add trial period if applicable
        if trial_days > 0:
            session_params["subscription_data"] = {
                "trial_period_days": trial_days
            }
            logger.info(f"Adding {trial_days}-day trial to subscription")
        
        # Add customer email if available
        if user_email:
            session_params["customer_email"] = user_email
        
        # Create the checkout session
        session = stripe.checkout.Session.create(**session_params)
        
        # Create payment transaction record BEFORE redirect
        if db is not None:
            transaction_doc = {
                "session_id": session.id,
                "user_id": user_id,
                "user_email": user_email,
                "package_id": checkout_data.package_id,
                "package_name": package["name"],
                "tier": package.get("tier", "unknown"),
                "amount": package["amount"],
                "currency": package["currency"],
                "interval": package["interval"],
                "trial_days": trial_days,
                "status": "initiated",
                "payment_status": "pending",
                "metadata": metadata,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.payment_transactions.insert_one(transaction_doc)
            logger.info(f"Created payment transaction: {session.id}")
        
        return CheckoutResponse(url=session.url, session_id=session.id)
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")
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
        if db is not None:
            transaction = await db.payment_transactions.find_one(
                {"session_id": session_id},
                {"_id": 0}
            )
        
        # Update transaction status if payment is complete and not already processed
        if db is not None and transaction and checkout_status.payment_status == "paid":
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
                
                # Get full session details from Stripe to get subscription and customer IDs
                stripe.api_key = stripe_api_key
                try:
                    stripe_session = stripe.checkout.Session.retrieve(session_id)
                    stripe_customer_id = stripe_session.customer
                    stripe_subscription_id = stripe_session.subscription
                except Exception as e:
                    logger.warning(f"Could not retrieve Stripe session details: {e}")
                    stripe_customer_id = None
                    stripe_subscription_id = None
                
                # Activate subscription for user
                user_id = transaction.get("user_id")
                if user_id:
                    subscription_end = datetime.now(timezone.utc)
                    interval = transaction.get("interval", "month")
                    trial_days = transaction.get("trial_days", 0)
                    
                    # If trial, extend the end date by trial period
                    if trial_days > 0:
                        from datetime import timedelta
                        subscription_end = subscription_end + timedelta(days=trial_days)
                        subscription_status = "trialing"
                    else:
                        subscription_status = "active"
                    
                    if interval == "year":
                        from datetime import timedelta
                        subscription_end = subscription_end + timedelta(days=365)
                    else:
                        from datetime import timedelta
                        subscription_end = subscription_end + timedelta(days=30)
                    
                    update_data = {
                        "subscription_status": subscription_status,
                        "subscription_package": transaction.get("package_id"),
                        "subscription_tier": transaction.get("tier"),
                        "subscription_start": datetime.now(timezone.utc).isoformat(),
                        "subscription_end": subscription_end.isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    # Add Stripe IDs if available
                    if stripe_customer_id:
                        update_data["stripe_customer_id"] = stripe_customer_id
                    if stripe_subscription_id:
                        update_data["stripe_subscription_id"] = stripe_subscription_id
                    
                    await db.users.update_one(
                        {"user_id": user_id},
                        {"$set": update_data}
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
    
    # Get tier from package ID if not directly stored
    tier = user.get("subscription_tier")
    if not tier and user.get("subscription_package"):
        package = SUBSCRIPTION_PACKAGES.get(user.get("subscription_package"), {})
        tier = package.get("tier", "bronze")
    
    return {
        "subscription_status": user.get("subscription_status", "none"),
        "subscription_package": user.get("subscription_package"),
        "subscription_tier": tier or "bronze",  # Default to bronze if none
        "subscription_start": user.get("subscription_start"),
        "subscription_end": user.get("subscription_end"),
        "is_active": user.get("subscription_status") == "active"
    }

@router.get("/tier-features/{tier}")
async def get_tier_features(tier: str):
    """Get features available for a specific tier"""
    tier_features = {
        "bronze": {
            "public_live_stats": False,
            "embed_widgets": False,
            "sponsor_banners": 0,
            "csv_export": False,
            "shared_access": False,
            "custom_branding": False,
            "white_label_embeds": False,
            "custom_team_logos": False,
            "priority_support": False
        },
        "silver": {
            "public_live_stats": True,
            "embed_widgets": True,
            "sponsor_banners": 5,
            "csv_export": True,
            "shared_access": False,
            "custom_branding": False,
            "white_label_embeds": False,
            "custom_team_logos": False,
            "priority_support": False
        },
        "gold": {
            "public_live_stats": True,
            "embed_widgets": True,
            "sponsor_banners": -1,  # Unlimited
            "csv_export": True,
            "shared_access": True,
            "custom_branding": True,
            "white_label_embeds": True,
            "custom_team_logos": True,
            "priority_support": True
        }
    }
    
    if tier not in tier_features:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}")
    
    return {"tier": tier, "features": tier_features[tier]}

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

@router.get("/subscription-details")
async def get_subscription_details(request: Request):
    """Get detailed subscription info including Stripe subscription ID"""
    user = await get_current_user_from_request(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    
    # Get user's subscription data from database
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "subscription_tier": 1, "subscription_status": 1, 
         "subscription_end": 1, "subscription_start": 1, "subscription_package": 1,
         "stripe_customer_id": 1, "stripe_subscription_id": 1, "email": 1, "tier": 1}
    )
    
    if not user_doc:
        return {
            "tier": "bronze",
            "status": "none",
            "is_active": False,
            "can_cancel": False
        }
    
    tier = user_doc.get("subscription_tier") or user_doc.get("tier") or "bronze"
    status = user_doc.get("subscription_status", "none")
    stripe_subscription_id = user_doc.get("stripe_subscription_id")
    
    # Try to get subscription details from Stripe if we have a subscription ID
    stripe_subscription = None
    if stripe_api_key and stripe_subscription_id:
        try:
            stripe.api_key = stripe_api_key
            stripe_subscription = stripe.Subscription.retrieve(stripe_subscription_id)
        except Exception as e:
            logger.warning(f"Could not retrieve Stripe subscription: {e}")
    
    # Build response
    response = {
        "tier": tier,
        "status": status,
        "package": user_doc.get("subscription_package"),
        "start_date": user_doc.get("subscription_start"),
        "end_date": user_doc.get("subscription_end"),
        "is_active": status in ["active", "trialing"],
        "is_trial": status == "trialing",
        "can_cancel": stripe_subscription_id is not None and status in ["active", "trialing"],
        "stripe_subscription_id": stripe_subscription_id
    }
    
    # Add Stripe-specific details if available
    if stripe_subscription:
        response["current_period_end"] = datetime.fromtimestamp(
            stripe_subscription.current_period_end, tz=timezone.utc
        ).isoformat()
        response["cancel_at_period_end"] = stripe_subscription.cancel_at_period_end
        if stripe_subscription.trial_end:
            response["trial_end"] = datetime.fromtimestamp(
                stripe_subscription.trial_end, tz=timezone.utc
            ).isoformat()
    
    return response

@router.post("/cancel-subscription")
async def cancel_subscription(request: Request):
    """Cancel user's subscription at end of billing period"""
    user = await get_current_user_from_request(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Get user's Stripe subscription ID
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "stripe_subscription_id": 1}
    )
    
    if not user_doc or not user_doc.get("stripe_subscription_id"):
        raise HTTPException(status_code=400, detail="No active subscription found")
    
    try:
        stripe.api_key = stripe_api_key
        # Cancel at end of period (not immediately)
        subscription = stripe.Subscription.modify(
            user_doc["stripe_subscription_id"],
            cancel_at_period_end=True
        )
        
        # Update user record
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "subscription_status": "canceling",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Subscription cancellation scheduled for user: {user['user_id']}")
        
        return {
            "success": True,
            "message": "Your subscription will be canceled at the end of the current billing period",
            "cancel_at": datetime.fromtimestamp(
                subscription.current_period_end, tz=timezone.utc
            ).isoformat()
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error canceling subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel subscription: {str(e)}")

@router.post("/reactivate-subscription")
async def reactivate_subscription(request: Request):
    """Reactivate a subscription that was set to cancel"""
    user = await get_current_user_from_request(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "stripe_subscription_id": 1}
    )
    
    if not user_doc or not user_doc.get("stripe_subscription_id"):
        raise HTTPException(status_code=400, detail="No subscription found")
    
    try:
        stripe.api_key = stripe_api_key
        subscription = stripe.Subscription.modify(
            user_doc["stripe_subscription_id"],
            cancel_at_period_end=False
        )
        
        # Update user record
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "subscription_status": "active",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Subscription reactivated for user: {user['user_id']}")
        
        return {
            "success": True,
            "message": "Your subscription has been reactivated"
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error reactivating subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reactivate subscription: {str(e)}")

@router.get("/payment-methods")
async def get_payment_methods(request: Request):
    """Get user's saved payment methods from Stripe"""
    user = await get_current_user_from_request(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "stripe_customer_id": 1}
    )
    
    if not user_doc or not user_doc.get("stripe_customer_id"):
        return {"payment_methods": [], "default_payment_method": None}
    
    try:
        stripe.api_key = stripe_api_key
        
        # Get customer's payment methods
        payment_methods = stripe.PaymentMethod.list(
            customer=user_doc["stripe_customer_id"],
            type="card"
        )
        
        # Get customer to find default payment method
        customer = stripe.Customer.retrieve(user_doc["stripe_customer_id"])
        default_pm = customer.invoice_settings.default_payment_method if customer.invoice_settings else None
        
        methods = []
        for pm in payment_methods.data:
            methods.append({
                "id": pm.id,
                "brand": pm.card.brand,
                "last4": pm.card.last4,
                "exp_month": pm.card.exp_month,
                "exp_year": pm.card.exp_year,
                "is_default": pm.id == default_pm
            })
        
        return {
            "payment_methods": methods,
            "default_payment_method": default_pm
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error getting payment methods: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get payment methods: {str(e)}")

@router.post("/create-setup-intent")
async def create_setup_intent(request: Request):
    """Create a Stripe SetupIntent for adding a new payment method"""
    user = await get_current_user_from_request(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    try:
        stripe.api_key = stripe_api_key
        
        # Get or create Stripe customer
        user_doc = await db.users.find_one(
            {"user_id": user["user_id"]},
            {"_id": 0, "stripe_customer_id": 1, "email": 1}
        )
        
        customer_id = user_doc.get("stripe_customer_id") if user_doc else None
        
        if not customer_id:
            # Create a new Stripe customer
            customer = stripe.Customer.create(
                email=user.get("email"),
                metadata={"user_id": user["user_id"]}
            )
            customer_id = customer.id
            
            # Save customer ID to user record
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {
                    "stripe_customer_id": customer_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        # Create SetupIntent
        setup_intent = stripe.SetupIntent.create(
            customer=customer_id,
            payment_method_types=["card"]
        )
        
        return {
            "client_secret": setup_intent.client_secret
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating setup intent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create setup intent: {str(e)}")

@router.post("/set-default-payment-method")
async def set_default_payment_method(request: Request):
    """Set a payment method as the default"""
    user = await get_current_user_from_request(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    payment_method_id = body.get("payment_method_id")
    
    if not payment_method_id:
        raise HTTPException(status_code=400, detail="Payment method ID required")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "stripe_customer_id": 1}
    )
    
    if not user_doc or not user_doc.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="No Stripe customer found")
    
    try:
        stripe.api_key = stripe_api_key
        
        # Update customer's default payment method
        stripe.Customer.modify(
            user_doc["stripe_customer_id"],
            invoice_settings={"default_payment_method": payment_method_id}
        )
        
        return {"success": True, "message": "Default payment method updated"}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error setting default payment method: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update payment method: {str(e)}")

@router.delete("/payment-method/{payment_method_id}")
async def delete_payment_method(payment_method_id: str, request: Request):
    """Delete a payment method"""
    user = await get_current_user_from_request(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    try:
        stripe.api_key = stripe_api_key
        stripe.PaymentMethod.detach(payment_method_id)
        
        return {"success": True, "message": "Payment method removed"}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error deleting payment method: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove payment method: {str(e)}")

@router.post("/create-billing-portal")
async def create_billing_portal(request: Request):
    """Create a Stripe Billing Portal session for self-service management"""
    user = await get_current_user_from_request(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "stripe_customer_id": 1}
    )
    
    if not user_doc or not user_doc.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="No Stripe customer found. Please subscribe first.")
    
    try:
        stripe.api_key = stripe_api_key
        
        body = await request.json()
        return_url = body.get("return_url", "")
        
        # Create billing portal session
        session = stripe.billing_portal.Session.create(
            customer=user_doc["stripe_customer_id"],
            return_url=return_url
        )
        
        return {"url": session.url}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating billing portal: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create billing portal: {str(e)}")

