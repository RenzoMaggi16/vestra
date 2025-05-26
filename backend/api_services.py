import yfinance as yf
from pycoingecko import CoinGeckoAPI
import pandas as pd
from datetime import datetime, timedelta
import random
import time

# Inicializar la API de CoinGecko
cg = CoinGeckoAPI()

# Caché para limitar las llamadas a las APIs
price_cache = {}
history_cache = {}
cache_expiry = 10  # Reducido de 60 a 10 segundos para actualizaciones más frecuentes

def get_stock_price(ticker, force_refresh=False):
    """Obtiene el precio actual de una acción usando yfinance"""
    cache_key = f"stock_{ticker}"
    
    # Verificar si hay datos en caché y si son recientes, a menos que se fuerce la actualización
    if not force_refresh and cache_key in price_cache and time.time() - price_cache[cache_key]['timestamp'] < cache_expiry:
        return price_cache[cache_key]['data']
    
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # Obtener el precio actual y el cambio porcentual
        current_price = info.get('regularMarketPrice', 0)
        previous_close = info.get('previousClose', current_price)
        
        if previous_close == 0:
            price_change_24h = 0
        else:
            price_change_24h = ((current_price - previous_close) / previous_close) * 100
        
        result = {
            'ticker': ticker,
            'current_price': current_price,
            'price_change_24h': price_change_24h,
            'last_updated': datetime.now(),
            'is_simulated': False  # Indicador para saber si los datos son reales
        }
        
        # Guardar en caché
        price_cache[cache_key] = {
            'data': result,
            'timestamp': time.time()
        }
        
        return result
    except Exception as e:
        print(f"Error al obtener precio de acción {ticker}: {e}")
        # Intentar una vez más antes de devolver datos simulados
        try:
            time.sleep(1)  # Esperar un segundo antes de reintentar
            stock = yf.Ticker(ticker)
            info = stock.info
            current_price = info.get('regularMarketPrice', 0)
            previous_close = info.get('previousClose', current_price)
            
            if previous_close == 0:
                price_change_24h = 0
            else:
                price_change_24h = ((current_price - previous_close) / previous_close) * 100
            
            result = {
                'ticker': ticker,
                'current_price': current_price,
                'price_change_24h': price_change_24h,
                'last_updated': datetime.now(),
                'is_simulated': False
            }
            
            price_cache[cache_key] = {
                'data': result,
                'timestamp': time.time()
            }
            
            return result
        except:
            # Si falla nuevamente, devolver datos simulados
            return simulate_price_data(ticker)

def get_crypto_price(ticker, force_refresh=False):
    """Obtiene el precio actual de una criptomoneda usando CoinGecko"""
    cache_key = f"crypto_{ticker}"
    
    # Verificar si hay datos en caché y si son recientes, a menos que se fuerce la actualización
    if not force_refresh and cache_key in price_cache and time.time() - price_cache[cache_key]['timestamp'] < cache_expiry:
        return price_cache[cache_key]['data']
    
    try:
        # Convertir ticker a formato de CoinGecko (ej. BTC -> bitcoin)
        crypto_id = get_crypto_id(ticker)
        
        if not crypto_id:
            return simulate_price_data(ticker)
        
        # Obtener datos de la criptomoneda
        coin_data = cg.get_coin_by_id(
            id=crypto_id,
            localization=False,
            tickers=False,
            market_data=True,
            community_data=False,
            developer_data=False
        )
        
        current_price = coin_data['market_data']['current_price']['usd']
        price_change_24h = coin_data['market_data']['price_change_percentage_24h']
        
        result = {
            'ticker': ticker,
            'current_price': current_price,
            'price_change_24h': price_change_24h,
            'last_updated': datetime.now(),
            'is_simulated': False  # Indicador para saber si los datos son reales
        }
        
        # Guardar en caché
        price_cache[cache_key] = {
            'data': result,
            'timestamp': time.time()
        }
        
        return result
    except Exception as e:
        print(f"Error al obtener precio de criptomoneda {ticker}: {e}")
        # Intentar una vez más antes de devolver datos simulados
        try:
            time.sleep(1)  # Esperar un segundo antes de reintentar
            coin_data = cg.get_coin_by_id(
                id=crypto_id,
                localization=False,
                tickers=False,
                market_data=True,
                community_data=False,
                developer_data=False
            )
            
            current_price = coin_data['market_data']['current_price']['usd']
            price_change_24h = coin_data['market_data']['price_change_percentage_24h']
            
            result = {
                'ticker': ticker,
                'current_price': current_price,
                'price_change_24h': price_change_24h,
                'last_updated': datetime.now(),
                'is_simulated': False
            }
            
            price_cache[cache_key] = {
                'data': result,
                'timestamp': time.time()
            }
            
            return result
        except:
            # Si falla nuevamente, devolver datos simulados
            return simulate_price_data(ticker)

def get_crypto_id(ticker):
    """Convierte un ticker de criptomoneda a su ID en CoinGecko"""
    ticker = ticker.lower()
    crypto_mapping = {
        'btc': 'bitcoin',
        'eth': 'ethereum',
        'sol': 'solana',
        'ada': 'cardano',
        'dot': 'polkadot',
        'bnb': 'binancecoin',
        'xrp': 'ripple',
        'doge': 'dogecoin',
        'shib': 'shiba-inu',
        'avax': 'avalanche-2',
        'matic': 'matic-network',
        'link': 'chainlink',
        'uni': 'uniswap',
        'ltc': 'litecoin'
    }
    return crypto_mapping.get(ticker)

def simulate_price_data(ticker):
    """Genera datos de precio simulados para cuando la API falla"""
    return {
        'ticker': ticker,
        'current_price': random.uniform(10, 1000),
        'price_change_24h': random.uniform(-5, 5),
        'last_updated': datetime.now(),
        'is_simulated': True  # Indicador para saber que los datos son simulados
    }

def get_historical_prices(ticker, asset_type, days=30):
    """Obtiene los precios históricos de un activo"""
    cache_key = f"{asset_type}_{ticker}_history_{days}"
    
    # Verificar si hay datos en caché y si son recientes
    if cache_key in history_cache and time.time() - history_cache[cache_key]['timestamp'] < cache_expiry * 10:
        return history_cache[cache_key]['data']
    
    try:
        if asset_type == "stock":
            return get_stock_historical_prices(ticker, days)
        elif asset_type == "crypto":
            return get_crypto_historical_prices(ticker, days)
    except Exception as e:
        print(f"Error al obtener historial de precios para {ticker}: {e}")
    
    # Si hay un error o no se reconoce el tipo de activo, devolver datos simulados
    return simulate_historical_prices(days)

def get_stock_historical_prices(ticker, days=30):
    """Obtiene los precios históricos de una acción"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    try:
        data = yf.download(ticker, start=start_date, end=end_date)
        
        if data.empty:
            return simulate_historical_prices(days)
        
        # Formatear los datos para el frontend
        dates = data.index.strftime('%Y-%m-%d').tolist()
        prices = data['Close'].tolist()
        
        result = {
            'dates': dates,
            'values': prices
        }
        
        # Guardar en caché
        history_cache[f"stock_{ticker}_history_{days}"] = {
            'data': result,
            'timestamp': time.time()
        }
        
        return result
    except:
        return simulate_historical_prices(days)

def get_crypto_historical_prices(ticker, days=30):
    """Obtiene los precios históricos de una criptomoneda"""
    crypto_id = get_crypto_id(ticker)
    
    if not crypto_id:
        return simulate_historical_prices(days)
    
    try:
        # Obtener datos históricos de CoinGecko
        market_data = cg.get_coin_market_chart_by_id(id=crypto_id, vs_currency='usd', days=days)
        
        # Formatear los datos para el frontend
        price_data = market_data['prices']
        dates = [datetime.fromtimestamp(price[0]/1000).strftime('%Y-%m-%d') for price in price_data]
        prices = [price[1] for price in price_data]
        
        result = {
            'dates': dates,
            'values': prices
        }
        
        # Guardar en caché
        history_cache[f"crypto_{ticker}_history_{days}"] = {
            'data': result,
            'timestamp': time.time()
        }
        
        return result
    except:
        return simulate_historical_prices(days)

def simulate_historical_prices(days=30):
    """Genera datos históricos simulados"""
    end_date = datetime.now()
    dates = [(end_date - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(days, -1, -1)]
    
    # Generar una tendencia aleatoria pero realista
    base_price = random.uniform(50, 500)
    volatility = random.uniform(0.005, 0.03)
    trend = random.uniform(-0.01, 0.01)
    
    prices = []
    current_price = base_price
    
    for _ in range(len(dates)):
        current_price = current_price * (1 + trend + random.uniform(-volatility, volatility))
        prices.append(round(current_price, 2))
    
    return {
        'dates': dates,
        'values': prices
    }