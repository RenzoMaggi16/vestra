from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Modelo para crear un usuario
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

# Modelo para la respuesta de usuario
class User(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    class Config:
        orm_mode = True

# Modelo para autenticación
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Modelo para token de autenticación
class Token(BaseModel):
    access_token: str
    token_type: str

# Modelo para datos del token
class TokenData(BaseModel):
    username: Optional[str] = None

# Modelo para crear una transacción
class TransactionCreate(BaseModel):
    asset_type: str
    ticker: str
    price: float
    quantity: float
    transaction_date: Optional[datetime] = None

# Modelo para la respuesta de transacción
class Transaction(BaseModel):
    id: int
    user_id: int
    asset_type: str
    ticker: str
    price: float
    quantity: float
    transaction_date: datetime

    class Config:
        orm_mode = True

# Modelo para un activo en el portfolio
class PortfolioAsset(BaseModel):
    ticker: str
    asset_type: str
    quantity: float
    avg_buy_price: float
    current_price: float
    price_change_24h: float
    total_value: float
    profit_loss: float
    profit_loss_percent: float

# Modelo para el resumen del portfolio
class PortfolioSummary(BaseModel):
    total_value: float
    daily_change_percent: float
    assets: List[PortfolioAsset]

# Modelo para el historial del portfolio
class PortfolioHistory(BaseModel):
    dates: List[str]
    values: List[float]

# Modelo para la asignación de activos
class AssetAllocation(BaseModel):
    ticker: str
    value: float
    percentage: float