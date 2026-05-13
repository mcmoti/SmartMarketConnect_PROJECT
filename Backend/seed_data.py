import os
import random
from decimal import Decimal

from smc_backend.apps.users.models import User
from smc_backend.apps.products.models import Product

roles = ['farmer', 'buyer', 'creditor']
password = '123456789'

produce_data = [
    {"name": "Tomatoes", "category": "vegetables", "unit": "kg", "price_min": 50, "price_max": 150},
    {"name": "Cabbages", "category": "vegetables", "unit": "unit", "price_min": 30, "price_max": 80},
    {"name": "Onions", "category": "vegetables", "unit": "kg", "price_min": 80, "price_max": 200},
    {"name": "Maize", "category": "cereals", "unit": "bag", "price_min": 2500, "price_max": 4500},
    {"name": "Beans", "category": "cereals", "unit": "bag", "price_min": 4000, "price_max": 8000},
    {"name": "Wheat", "category": "cereals", "unit": "bag", "price_min": 3000, "price_max": 5000},
    {"name": "Sukuma Wiki", "category": "vegetables", "unit": "bunch", "price_min": 10, "price_max": 30},
    {"name": "Sorghum", "category": "cereals", "unit": "kg", "price_min": 80, "price_max": 120},
]

kenyan_locations = [
    'Nairobi', 'Nakuru', 'Eldoret', 'Kitale', 'Meru',
    'Nyeri', 'Machakos', 'Kisumu', 'Kakamega', 'Bungoma'
]

print("Starting to seed users and produce...")

import time
import random
# Using a counter from a known base to ensure distinct phone numbers during this script
base_phone = random.randint(10000000, 99999990)

users_created = {'farmer': [], 'buyer': [], 'creditor': []}

for role in roles:
    for i in range(10):
        base_phone += 1
        phone = f"+2547{base_phone:08d}"
        username = f"seed_{role}_{base_phone}"
        
        user = User.objects.create_user(
            username=username,
            password=password,
            phone_number=phone,
            role=role,
            is_verified=True,
            location=random.choice(kenyan_locations),
            first_name=f"{role.capitalize()}",
            last_name=f"{i+1}"
        )
        users_created[role].append(user)
        print(f"Created {role}: {username} ({phone})")

print("Created 10 users for each role.")

farmers = users_created['farmer']

for farmer in farmers:
    products = random.sample(produce_data, 2)
    for p in products:
        Product.objects.create(
            farmer=farmer,
            name=p['name'],
            category=p['category'],
            quantity=Decimal(random.randint(10, 100)),
            unit=p['unit'],
            price=Decimal(random.randint(p['price_min'], p['price_max'])),
            location=farmer.location,
            description=f"Fresh {p['name']} straight from the farm.",
            status='active',
            availability='available',
            quality_grade=random.choice(['A', 'B', 'C'])
        )
        print(f"Created produce for {farmer.username}: {p['name']}")

print("Seeding complete.")
