import asyncio
from database import db
from services.auth import get_password_hash

async def create_demo_user():
    # Hash the password 'demo'
    hashed_password = get_password_hash('demo')
    
    # Create demo user
    demo_user = await db.create_user({
        'name': 'Demo User',
        'email': 'demo@example.com',
        'password_hash': hashed_password,
        'credits': 10000,
        'plan': 'free'
    })
    
    if demo_user:
        print('Demo user created successfully!')
        print(f'User ID: {demo_user["id"]}')
        print(f'Email: {demo_user["email"]}')
        print(f'Credits: {demo_user["credits"]}')
        
        # Create credit transaction for the demo credits
        await db.create_credit_transaction({
            'user_id': demo_user['id'],
            'amount': 10000,
            'transaction_type': 'demo_bonus',
            'description': 'Demo account - 10,000 credits'
        })
        print('Credit transaction created!')
    else:
        print('Failed to create demo user')

if __name__ == "__main__":
    asyncio.run(create_demo_user())