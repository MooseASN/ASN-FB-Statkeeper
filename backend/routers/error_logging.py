"""
Error Logging Router - Simple built-in error tracking
Logs frontend and backend errors to database for admin viewing
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import logging
import traceback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/errors", tags=["errors"])

# MongoDB connection - will be set by main app
db = None

def set_db(database):
    """Set the database connection from main app"""
    global db
    db = database

class ErrorLogRequest(BaseModel):
    error_type: str  # 'frontend', 'api', 'integration'
    message: str
    stack_trace: Optional[str] = None
    url: Optional[str] = None
    user_agent: Optional[str] = None
    component: Optional[str] = None
    additional_info: Optional[dict] = None

class ErrorLogResponse(BaseModel):
    id: str
    timestamp: str
    error_type: str
    message: str
    resolved: bool

@router.post("/log")
async def log_error(request: Request, error: ErrorLogRequest):
    """Log an error from frontend or backend"""
    
    if db is None:
        return {"success": False, "message": "Database not available"}
    
    # Get user info if available
    user_id = None
    user_email = None
    try:
        from server import get_current_user_from_request
        user = await get_current_user_from_request(request)
        if user:
            user_id = user.get("user_id")
            user_email = user.get("email")
    except:
        pass
    
    # Create error log entry
    error_doc = {
        "error_id": f"err_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "error_type": error.error_type,
        "message": error.message,
        "stack_trace": error.stack_trace,
        "url": error.url,
        "user_agent": error.user_agent,
        "component": error.component,
        "additional_info": error.additional_info,
        "user_id": user_id,
        "user_email": user_email,
        "resolved": False,
        "resolution_notes": None
    }
    
    try:
        await db.error_logs.insert_one(error_doc)
        logger.info(f"Error logged: {error.error_type} - {error.message[:100]}")
        return {"success": True, "error_id": error_doc["error_id"]}
    except Exception as e:
        logger.error(f"Failed to log error: {e}")
        return {"success": False, "message": str(e)}

@router.get("/admin/list")
async def get_error_logs(
    request: Request,
    error_type: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get error logs (admin only)"""
    
    # Check admin access
    try:
        from server import get_admin_user, User
        # Simple check - if this fails, user isn't admin
        admin = await get_admin_user(request)
    except:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if db is None:
        return {"errors": [], "total": 0}
    
    # Build query
    query = {}
    if error_type:
        query["error_type"] = error_type
    if resolved is not None:
        query["resolved"] = resolved
    
    # Get total count
    total = await db.error_logs.count_documents(query)
    
    # Get error logs
    errors = await db.error_logs.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "errors": errors,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@router.get("/admin/stats")
async def get_error_stats(request: Request):
    """Get error statistics (admin only)"""
    
    # Check admin access
    try:
        from server import get_admin_user
        admin = await get_admin_user(request)
    except:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if db is None:
        return {"total": 0, "unresolved": 0, "by_type": {}}
    
    # Get counts
    total = await db.error_logs.count_documents({})
    unresolved = await db.error_logs.count_documents({"resolved": False})
    
    # Get counts by type
    pipeline = [
        {"$group": {"_id": "$error_type", "count": {"$sum": 1}}}
    ]
    by_type_cursor = db.error_logs.aggregate(pipeline)
    by_type = {}
    async for doc in by_type_cursor:
        by_type[doc["_id"]] = doc["count"]
    
    # Get recent errors (last 24 hours)
    from datetime import timedelta
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    recent = await db.error_logs.count_documents({
        "timestamp": {"$gte": yesterday.isoformat()}
    })
    
    return {
        "total": total,
        "unresolved": unresolved,
        "recent_24h": recent,
        "by_type": by_type
    }

@router.put("/admin/{error_id}/resolve")
async def resolve_error(error_id: str, request: Request):
    """Mark an error as resolved (admin only)"""
    
    # Check admin access
    try:
        from server import get_admin_user
        admin = await get_admin_user(request)
    except:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    body = await request.json()
    notes = body.get("notes", "")
    
    result = await db.error_logs.update_one(
        {"error_id": error_id},
        {"$set": {
            "resolved": True,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolved_by": admin.email,
            "resolution_notes": notes
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Error not found")
    
    return {"success": True, "message": "Error marked as resolved"}

@router.delete("/admin/{error_id}")
async def delete_error(error_id: str, request: Request):
    """Delete an error log (admin only)"""
    
    # Check admin access
    try:
        from server import get_admin_user
        admin = await get_admin_user(request)
    except:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    result = await db.error_logs.delete_one({"error_id": error_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Error not found")
    
    return {"success": True, "message": "Error deleted"}

@router.delete("/admin/clear-resolved")
async def clear_resolved_errors(request: Request):
    """Clear all resolved errors (admin only)"""
    
    # Check admin access
    try:
        from server import get_admin_user
        admin = await get_admin_user(request)
    except:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    result = await db.error_logs.delete_many({"resolved": True})
    
    return {"success": True, "deleted_count": result.deleted_count}
