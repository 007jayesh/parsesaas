from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes import auth, convert, streaming_convert, fast_convert, payments, paddle_payments, razorpay_payments, table_convert, contact

# Create FastAPI app
app = FastAPI(
    title="The Bank Statement Parser API",
    description="Convert bank statements to CSV/Excel/JSON formats with AI-powered accuracy",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(convert.router)
app.include_router(table_convert.router)
app.include_router(streaming_convert.router)
app.include_router(fast_convert.router)
app.include_router(payments.router)
app.include_router(paddle_payments.router)
app.include_router(razorpay_payments.router)
app.include_router(contact.router)

@app.get("/")
async def root():
    return {
        "message": "The Bank Statement Parser API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)