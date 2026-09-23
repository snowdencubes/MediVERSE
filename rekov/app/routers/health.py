from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "rekov-backend",
        "version": "1.0.0"
    }
