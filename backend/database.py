from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import os
from datetime import datetime
from passlib.context import CryptContext

# Crear el directorio data si no existe
os.makedirs("data", exist_ok=True)

# Configurar la base de datos SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./data/portfolio.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Configuración para hash de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Definir el modelo ORM para usuarios
class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relación con transacciones
    transactions = relationship("TransactionModel", back_populates="user")

# Definir el modelo ORM para las transacciones
class TransactionModel(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    asset_type = Column(String, index=True)
    ticker = Column(String, index=True)
    price = Column(Float)
    quantity = Column(Float)
    transaction_date = Column(DateTime, default=datetime.now)
    
    # Relación con usuario
    user = relationship("UserModel", back_populates="transactions")

# Definir el modelo ORM para los precios históricos
class PriceHistoryModel(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    price = Column(Float)
    date = Column(DateTime, index=True)

# Crear las tablas en la base de datos
Base.metadata.create_all(bind=engine)

# Función para obtener una sesión de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Funciones para manejar contraseñas
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)