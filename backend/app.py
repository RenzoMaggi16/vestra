from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
from datetime import datetime, timedelta
import random

from database import get_db, TransactionModel, PriceHistoryModel, UserModel, get_password_hash
from models import (
    TransactionCreate, Transaction, PortfolioSummary, 
    PortfolioAsset, PortfolioHistory, AssetAllocation,
    UserCreate, User, Token
)
from api_services import (
    get_stock_price, get_crypto_price, 
    get_historical_prices, simulate_historical_prices
)
from auth import authenticate_user, create_access_token, get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES

app = FastAPI(title="Portfolio Investment API")

# Configurar CORS para permitir solicitudes desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar el origen exacto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint para registrar un nuevo usuario
@app.post("/users/", response_model=User)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Verificar si el email ya existe
    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    # Verificar si el username ya existe
    db_user = db.query(UserModel).filter(UserModel.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Nombre de usuario ya registrado")
    
    # Crear el nuevo usuario
    hashed_password = get_password_hash(user.password)
    db_user = UserModel(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Endpoint para login
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Endpoint para obtener información del usuario actual
@app.get("/users/me/", response_model=User)
async def read_users_me(current_user = Depends(get_current_active_user)):
    return current_user

# Endpoint para agregar una nueva transacción
@app.post("/transactions/", response_model=Transaction)
def create_transaction(
    transaction: TransactionCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    db_transaction = TransactionModel(
        user_id=current_user.id,
        asset_type=transaction.asset_type,
        ticker=transaction.ticker.upper(),
        price=transaction.price,
        quantity=transaction.quantity,
        transaction_date=transaction.transaction_date or datetime.now()
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

# Endpoint para obtener todas las transacciones del usuario actual
@app.get("/transactions/", response_model=List[Transaction])
def read_transactions(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    transactions = db.query(TransactionModel).filter(
        TransactionModel.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return transactions

# Endpoint para obtener el resumen del portfolio del usuario actual
@app.get("/portfolio/summary/", response_model=PortfolioSummary)
def get_portfolio_summary(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # Obtener todas las transacciones del usuario
    transactions = db.query(TransactionModel).filter(
        TransactionModel.user_id == current_user.id
    ).all()
    
    # Si no hay transacciones, devolver un portfolio vacío
    if not transactions:
        return PortfolioSummary(
            total_value=0,
            daily_change_percent=0,
            assets=[]
        )
    
    # Agrupar transacciones por ticker y tipo de activo
    portfolio = {}
    for tx in transactions:
        key = (tx.ticker, tx.asset_type)
        if key not in portfolio:
            portfolio[key] = {
                'ticker': tx.ticker,
                'asset_type': tx.asset_type,
                'total_quantity': 0,
                'total_cost': 0
            }
        
        portfolio[key]['total_quantity'] += tx.quantity
        portfolio[key]['total_cost'] += tx.price * tx.quantity
    
    # Calcular el precio promedio de compra y obtener precios actuales
    portfolio_assets = []
    total_value = 0
    total_cost = 0
    
    for (ticker, asset_type), asset in portfolio.items():
        # Omitir activos con cantidad 0
        if asset['total_quantity'] <= 0:
            continue
            
        # Calcular precio promedio de compra
        avg_buy_price = asset['total_cost'] / asset['total_quantity'] if asset['total_quantity'] > 0 else 0
        
        # Obtener precio actual
        if asset_type == "stock":
            price_data = get_stock_price(ticker)
        else:
            price_data = get_crypto_price(ticker)
        
        current_price = price_data['current_price']
        price_change_24h = price_data['price_change_24h']
        
        # Calcular valor actual y ganancias/pérdidas
        asset_value = current_price * asset['total_quantity']
        profit_loss = asset_value - asset['total_cost']
        profit_loss_percent = (profit_loss / asset['total_cost']) * 100 if asset['total_cost'] > 0 else 0
        
        # Agregar al valor total
        total_value += asset_value
        total_cost += asset['total_cost']
        
        # Crear objeto de activo para el portfolio
        portfolio_asset = PortfolioAsset(
            ticker=ticker,
            asset_type=asset_type,
            quantity=asset['total_quantity'],
            avg_buy_price=avg_buy_price,
            current_price=current_price,
            price_change_24h=price_change_24h,
            total_value=asset_value,
            profit_loss=profit_loss,
            profit_loss_percent=profit_loss_percent
        )
        
        portfolio_assets.append(portfolio_asset)
    
    # Calcular cambio porcentual diario del portfolio completo
    daily_change_percent = 0
    if total_value > 0:
        weighted_change = sum(asset.price_change_24h * asset.total_value for asset in portfolio_assets)
        daily_change_percent = weighted_change / total_value
    
    # Ordenar activos por valor (de mayor a menor)
    portfolio_assets.sort(key=lambda x: x.total_value, reverse=True)
    
    return PortfolioSummary(
        total_value=total_value,
        daily_change_percent=daily_change_percent,
        assets=portfolio_assets
    )

# Endpoint para obtener el historial del portfolio del usuario actual
@app.get("/portfolio/history/", response_model=PortfolioHistory)
def get_portfolio_history(
    days: int = 30, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # Obtener todas las transacciones del usuario
    transactions = db.query(TransactionModel).filter(
        TransactionModel.user_id == current_user.id
    ).all()
    
    # Si no hay transacciones, devolver datos simulados
    if not transactions:
        return simulate_historical_prices(days)
    
    # Agrupar transacciones por ticker y tipo de activo
    assets = {}
    for tx in transactions:
        key = (tx.ticker, tx.asset_type)
        if key not in assets:
            assets[key] = []
        assets[key].append(tx)
    
    # Fecha actual y fecha de inicio
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Crear un DataFrame con todas las fechas
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    portfolio_history = pd.DataFrame(index=date_range)
    portfolio_history['total_value'] = 0
    
    # Para cada activo, obtener su historial de precios y calcular el valor diario
    for (ticker, asset_type), asset_transactions in assets.items():
        # Obtener historial de precios
        price_history = get_historical_prices(ticker, asset_type, days)
        
        # Convertir a DataFrame
        price_df = pd.DataFrame({
            'date': pd.to_datetime(price_history['dates']),
            'price': price_history['values']
        }).set_index('date')
        
        # Para cada día, calcular la cantidad de activos que tenía el usuario
        for date in date_range:
            # Filtrar transacciones anteriores a esta fecha
            valid_txs = [tx for tx in asset_transactions if tx.transaction_date <= date]
            
            # Calcular cantidad total
            quantity = sum(tx.quantity for tx in valid_txs)
            
            # Si hay cantidad positiva, calcular el valor
            if quantity > 0:
                # Obtener el precio más cercano a esta fecha
                closest_date = price_df.index[price_df.index.get_indexer([date], method='nearest')[0]]
                price = price_df.loc[closest_date, 'price']
                
                # Agregar al valor total del portfolio
                portfolio_history.loc[date, 'total_value'] += price * quantity
    
    # Formatear para la respuesta
    dates = portfolio_history.index.strftime('%Y-%m-%d').tolist()
    values = portfolio_history['total_value'].tolist()
    
    return PortfolioHistory(
        dates=dates,
        values=values
    )

# Endpoint para obtener la asignación del portfolio del usuario actual
@app.get("/portfolio/allocation/", response_model=List[AssetAllocation])
def get_portfolio_allocation(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # Obtener el resumen del portfolio
    summary = get_portfolio_summary(db, current_user)
    
    if not summary.assets:
        return []
    
    # Calcular la asignación por activo
    allocations = []
    for asset in summary.assets:
        allocation = AssetAllocation(
            ticker=asset.ticker,
            value=asset.total_value,
            percentage=(asset.total_value / summary.total_value) * 100 if summary.total_value > 0 else 0
        )
        allocations.append(allocation)
    
    # Ordenar por porcentaje (de mayor a menor)
    allocations.sort(key=lambda x: x.percentage, reverse=True)
    
    return allocations

# Endpoint para obtener el precio de un activo
@app.get("/price/{asset_type}/{ticker}")
def get_asset_price(asset_type: str, ticker: str):
    ticker = ticker.upper()
    
    if asset_type == "stock":
        return get_stock_price(ticker)
    elif asset_type == "crypto":
        return get_crypto_price(ticker)
    else:
        raise HTTPException(status_code=400, detail="Tipo de activo no válido")

# Ya no necesitamos agregar datos de ejemplo automáticamente
# La función add_sample_data se elimina
def add_sample_data(db: Session):
    # Verificar si ya hay datos
    if db.query(TransactionModel).count() > 0:
        return
    
    # Datos de ejemplo
    sample_data = [
        # Acciones
        {"asset_type": "stock", "ticker": "AAPL", "price": 150.25, "quantity": 10, "transaction_date": datetime.now() - timedelta(days=60)},
        {"asset_type": "stock", "ticker": "MSFT", "price": 290.10, "quantity": 5, "transaction_date": datetime.now() - timedelta(days=45)},
        {"asset_type": "stock", "ticker": "AMZN", "price": 3200.50, "quantity": 2, "transaction_date": datetime.now() - timedelta(days=30)},
        {"asset_type": "stock", "ticker": "GOOGL", "price": 2800.75, "quantity": 3, "transaction_date": datetime.now() - timedelta(days=20)},
        
        # Criptomonedas
        {"asset_type": "crypto", "ticker": "BTC", "price": 35000.00, "quantity": 0.5, "transaction_date": datetime.now() - timedelta(days=90)},
        {"asset_type": "crypto", "ticker": "ETH", "price": 2400.00, "quantity": 3, "transaction_date": datetime.now() - timedelta(days=75)},
        {"asset_type": "crypto", "ticker": "SOL", "price": 150.00, "quantity": 20, "transaction_date": datetime.now() - timedelta(days=40)},
        {"asset_type": "crypto", "ticker": "ADA", "price": 2.10, "quantity": 1000, "transaction_date": datetime.now() - timedelta(days=25)},
    ]
    
    # Agregar datos a la base de datos
    for data in sample_data:
        db_transaction = TransactionModel(**data)
        db.add(db_transaction)
    
    db.commit()

# Evento de inicio de la aplicación
@app.on_event("startup")
def startup_event():
    db = next(get_db())
    add_sample_data(db)

# Ejecutar la aplicación
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)