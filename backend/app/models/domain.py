from sqlalchemy import Column, String, Float, Date, DateTime, Text, Integer, ForeignKey
from datetime import datetime
import uuid
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Business(Base):
    __tablename__ = "businesses"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, default="PathFortune Solutions Pvt Ltd")
    industry = Column(String, default="SaaS & Software Services")
    currency = Column(String, default="INR")
    fiscal_year_start = Column(String, default="April")
    created_at = Column(DateTime, default=datetime.utcnow)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False)
    date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    type = Column(String, nullable=False)  # Income, Expense
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String, default="Bank Transfer")
    department = Column(String, default="General")
    vendor_customer = Column(String, nullable=True)
    status = Column(String, default="Completed")
    created_at = Column(DateTime, default=datetime.utcnow)

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False)
    month = Column(String, nullable=False)  # YYYY-MM
    category = Column(String, nullable=False)
    department = Column(String, default="General")
    allocated_amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "settings"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False)
    default_forecast_horizon = Column(Integer, default=3)
    ai_provider = Column(String, default="gemini")
    ai_model = Column(String, default="gemini-1.5-flash")
    updated_at = Column(DateTime, default=datetime.utcnow)
