#!/usr/bin/env python3
"""ALUSORA Flowers: dependency-free storefront, transactional SQLite stock and admin API."""
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from collections import Counter
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT = Path(__file__).resolve().parent
WEB = ROOT / 'web'
DB_PATH = Path(os.getenv('ALUSORA_DB_PATH', str(ROOT / 'alusora.sqlite3')))
ADMIN_TOKEN = os.getenv('ALUSORA_ADMIN_TOKEN', '').strip()
HOST = os.getenv('HOST', '127.0.0.1')
PORT = int(os.getenv('PORT', '8080'))
HST_RATE = Decimal('0.13')
try:
    TZ = ZoneInfo('America/Toronto')
except ZoneInfoNotFoundError:
    # Fresh Windows Python installations often lack the IANA tz database.
    # Local demo mode can use the system timezone; production should install tzdata.
    TZ = datetime.now().astimezone().tzinfo

SEED_STOCK = [
    ('carnation', 'Carnations / Claveles', 180, 'stem'),
    ('alstro', 'Alstroemeria', 110, 'stem'),
    ('chrys', 'Chrysanthemums / Crisantemos', 75, 'stem'),
    ('rose', 'Roses / Rosas', 52, 'stem'),
    ('foliage', 'Greenery / Follaje', 90, 'bunch'),
    ('pine', 'Winter greens / Pino', 65, 'sprig'),
    ('wrap', 'Gift wrapping / Envoltura', 100, 'unit'),
    ('ribbon', 'Ribbon / Listón', 120, 'unit'),
    ('card', 'Message card / Tarjeta', 120, 'unit'),
    ('vase', 'Small vase / Florero', 24, 'unit'),
    ('pinecone', 'Pine cones / Piñas', 45, 'unit'),
    ('poinsettia', 'Potted poinsettia', 18, 'plant'),
]
PRODUCTS = [
    dict(id='cozy-hello', name='Cozy Hello', subtitle='A little flower. A big smile.', category='Everyday', price=1499, artwork='blush', tag='Under $20', recipe={'carnation':3,'alstro':1,'foliage':1,'wrap':1,'ribbon':1,'card':1}, description='Soft blooms, kraft wrapping and a little note — ready to make someone smile.'),
    dict(id='autumn-everyday', name='Everyday Bouquet', subtitle='Beautiful everyday flowers.', category='Everyday', price=2999, artwork='apricot', tag='Bestseller', recipe={'carnation':5,'alstro':3,'chrys':1,'foliage':1,'wrap':1,'ribbon':1,'card':1}, description='A generous, hand-tied bouquet in a fresh seasonal palette.'),
    dict(id='thank-you-jar', name='Thank You Jar', subtitle='A thoughtful thank you.', category='Everyday', price=3999, artwork='berry', tag='Vase included', recipe={'carnation':5,'alstro':2,'chrys':2,'foliage':1,'vase':1,'ribbon':1,'card':1}, description='Fresh-cut stems presented in a reusable glass vase.'),
    dict(id='warm-moments', name='Warm Moments', subtitle='For the extra-special days.', category='Everyday', price=4999, artwork='peach', tag='Signature', recipe={'rose':3,'carnation':4,'alstro':2,'chrys':2,'foliage':1,'wrap':1,'ribbon':1,'card':1}, description='Romantic roses and seasonal blooms, wrapped with care.'),
    dict(id='little-christmas', name='Little Christmas Joy', subtitle='A festive little surprise.', category='Holiday', price=1499, artwork='holiday', tag='Under $20', recipe={'carnation':3,'pine':1,'wrap':1,'ribbon':1,'card':1}, description='A petite festive bundle with a touch of winter greenery.'),
    dict(id='christmas-poinsettia', name='Christmas Poinsettia', subtitle='A little holiday classic.', category='Holiday', price=1999, artwork='poinsettia', tag='Limited', recipe={'poinsettia':1,'ribbon':1,'card':1}, description='A potted seasonal favourite, ribbon-tied and ready for gifting.'),
    dict(id='winter-glow', name='Winter Glow', subtitle='Winter blooms, beautifully wrapped.', category='Holiday', price=2999, artwork='winter', tag='Bestseller', recipe={'carnation':4,'alstro':2,'chrys':1,'foliage':1,'pine':1,'wrap':1,'ribbon':1,'card':1}, description='Winter whites, gentle greens and a golden finishing touch.'),
    dict(id='christmas-table', name='Christmas Table', subtitle='Something lovely for the table.', category='Holiday', price=4999, artwork='holiday', tag='Centrepiece', recipe={'carnation':7,'chrys':3,'pine':2,'pinecone':2,'vase':1,'ribbon':1,'card':1}, description='An inviting centrepiece for festive gatherings, vessel included.'),
    dict(id='holiday-signature', name='Holiday Signature', subtitle='A gift worth gathering around.', category='Holiday', price=6999, artwork='berry', tag='Premium', recipe={'rose':4,'carnation':6,'alstro':3,'chrys':2,'foliage':2,'pine':2,'vase':1,'ribbon':1,'card':1}, description='Our fullest seasonal arrangement, made to order with a keepsake vase.'),
]
PRODUCT_BY_ID = {p['id']: p for p in PRODUCTS}
FLOWERS = [
    dict(id='carnation', name='Carnations', note='Soft, long-lasting petals', price=325, colour='pink'),
    dict(id='alstro', name='Alstroemeria', note='Delicate, playful blooms', price=350, colour='peach'),
    dict(id='chrys', name='Chrysanthemums', note='Full, beautiful texture', price=450, colour='cream'),
    dict(id='rose', name='Roses', note='A timeless romantic touch', price=625, colour='burgundy'),
]
FLOWER_BY_ID = {f['id']:f for f in FLOWERS}
MIME = {'.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon'}
RATE_LOCK = threading.Lock()
RATE_BUCKETS = {}


def connect():
    cx = sqlite3.connect(DB_PATH, timeout=12, isolation_level=None)
    cx.row_factory = sqlite3.Row
    cx.execute('PRAGMA foreign_keys=ON')
    cx.execute('PRAGMA busy_timeout=12000')
    return cx


def init_database():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.executescript('''
        CREATE TABLE IF NOT EXISTS inventory (
            sku TEXT PRIMARY KEY, name TEXT NOT NULL, on_hand INTEGER NOT NULL CHECK(on_hand >= 0), unit TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE,
            customer_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
            pickup_date TEXT NOT NULL, pickup_slot TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
            subtotal_cents INTEGER NOT NULL, tax_cents INTEGER NOT NULL, total_cents INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL REFERENCES orders(id),
            label TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price_cents INTEGER NOT NULL,
            recipe_json TEXT NOT NULL, options_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS event_quotes (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
            event_type TEXT NOT NULL, event_date TEXT NOT NULL, guests INTEGER NOT NULL, quantity INTEGER NOT NULL DEFAULT 1,
            arrangements TEXT NOT NULL, budget TEXT NOT NULL, palette TEXT NOT NULL, message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS inventory_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL, change_qty INTEGER NOT NULL,
            reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        ''')
        if 'quantity' not in {r['name'] for r in db.execute('PRAGMA table_info(event_quotes)')} :
            db.execute('ALTER TABLE event_quotes ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1')
        for sku, name, qty, unit in SEED_STOCK:
            db.execute('INSERT OR IGNORE INTO inventory(sku,name,on_hand,unit) VALUES(?,?,?,?)',(sku,name,qty,unit))


def safe_text(value, field, max_length, min_length=1):
    if not isinstance(value, str): raise ValidationError(f'{field}: please enter valid text.')
    val = value.strip()
    if len(val) < min_length or len(val) > max_length:
        raise ValidationError(f'{field}: must have between {min_length} and {max_length} characters.')
    return val


def safe_email(v):
    v = safe_text(v,'Email',160)
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',v): raise ValidationError('Please enter a valid email address.')
    return v


def safe_phone(v):
    v = safe_text(v,'Phone',35,7)
    if not re.fullmatch(r'[0-9+() .-]{7,35}',v): raise ValidationError('Please enter a valid phone number.')
    return v


def safe_date(v, field, earliest=None, latest_days=400):
    try: d = date.fromisoformat(v)
    except (TypeError, ValueError): raise ValidationError(f'{field}: please select a valid date.')
    today = datetime.now(TZ).date()
    if d < (earliest if earliest else today) or d > today + timedelta(days=latest_days):
        raise ValidationError(f'{field}: selected date is outside the allowed range.')
    return d.isoformat()


class ValidationError(Exception): pass
class StockError(Exception):
    def __init__(self, message, available=None):
        super().__init__(message)
        self.available = available


def stock_map(cx):
    return {r['sku']:r['on_hand'] for r in cx.execute('SELECT sku,on_hand FROM inventory')}


def recipe_available(recipe, stock):
    return max(0, min((stock.get(k,0) // q for k,q in recipe.items()), default=0))


def custom_bouquet(choice):
    if not isinstance(choice, dict): raise ValidationError('Custom bouquet selections are missing.')
    stems = choice.get('stems')
    if not isinstance(stems, dict) or set(stems) - set(FLOWER_BY_ID):
        raise ValidationError('Please select valid flower types.')
    quantities = {}
    for key in FLOWER_BY_ID:
        q = stems.get(key,0)
        if type(q) is not int or q < 0 or q > 24: raise ValidationError('Choose between 0 and 24 stems per flower.')
        if q: quantities[key] = q
    n = sum(quantities.values())
    if n < 3 or n > 24: raise ValidationError('Choose between 3 and 24 flower stems.')
    finish = choice.get('finish','wrapped')
    if finish not in ('wrapped','vase'): raise ValidationError('Please choose a valid finish.')
    palette = safe_text(choice.get('palette','Blush & cream'), 'Colour preference', 40)
    if palette not in ('Blush & cream','Winter white','Warm sunset','Florist’s choice'):
        raise ValidationError('Please select a valid colour palette.')
    price = 599 + sum(FLOWER_BY_ID[k]['price']*v for k,v in quantities.items())
    recipe = dict(quantities)
    recipe.update({'foliage':1, 'ribbon':1,'card':1})
    if finish == 'vase':
        recipe['vase'] = 1
        price += 1000
    else: recipe['wrap'] = 1
    label = 'Build Your Bouquet' + (' · in vase' if finish == 'vase' else ' · hand-wrapped')
    return dict(label=label, unit_price=price, recipe=recipe, options={'stems':quantities,'finish':finish,'palette':palette})


def parse_items(body):
    rows = body.get('items')
    if not isinstance(rows,list) or not (1 <= len(rows) <= 16): raise ValidationError('Add between 1 and 16 cart lines.')
    parsed=[]
    for it in rows:
        if not isinstance(it,dict): raise ValidationError('Invalid item in cart.')
        count=it.get('qty',1)
        if type(count) is not int or not (1 <= count <= 12): raise ValidationError('Choose 1–12 per cart item.')
        sku=it.get('id')
        if sku == 'custom':
            data = custom_bouquet(it.get('choice'))
        elif sku in PRODUCT_BY_ID:
            p=PRODUCT_BY_ID[sku]
            data=dict(label=p['name'],unit_price=p['price'],recipe=p['recipe'],options={})
        else: raise ValidationError('One of the selected products no longer exists.')
        parsed.append(dict(id=sku,qty=count,**data))
    if sum(x['qty'] for x in parsed)>30: raise ValidationError('Maximum 30 arrangements per order. For larger orders, request an event quote.')
    return parsed


def get_catalog():
    with connect() as db: stock=stock_map(db)
    visible=[]
    for p in PRODUCTS:
        visible.append(dict(p) | {'available':recipe_available(p['recipe'],stock)})
    flowers=[f | {'available':stock.get(f['id'],0)} for f in FLOWERS]
    return {'products':visible,'flowers':flowers,'stock':stock,'currency':'CAD','tax_rate':13,'payment_mode':'pay_at_pickup'}


def create_order(body):
    if not isinstance(body,dict): raise ValidationError('Invalid order.')
    name=safe_text(body.get('name'), 'Name', 100)
    email=safe_email(body.get('email'))
    phone=safe_phone(body.get('phone'))
    pickup_date=safe_date(body.get('pickup_date'),'Pickup date',datetime.now(TZ).date()+timedelta(days=1),60)
    pickup_slot=safe_text(body.get('pickup_slot'),'Pickup time',20)
    if pickup_slot not in ('11:00 AM','1:00 PM','3:00 PM','5:00 PM'):
        raise ValidationError('Choose an available pickup time.')
    notes=safe_text(body.get('notes',''),'Order notes',500,0)
    key=safe_text(body.get('idempotency_key'),'Request key',100)
    if not re.fullmatch(r'[A-Za-z0-9_-]{12,100}', key): raise ValidationError('Invalid request identifier.')
    items=parse_items(body)
    subtotal=sum(it['unit_price']*it['qty'] for it in items)
    tax=int((Decimal(subtotal)*HST_RATE).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
    total=subtotal+tax
    required=Counter()
    for it in items:
        for sku,units in it['recipe'].items(): required[sku]+=units*it['qty']
    oid='ALU-'+secrets.token_hex(4).upper()
    db=connect()
    try:
        db.execute('BEGIN IMMEDIATE')
        existing=db.execute('SELECT id,subtotal_cents,tax_cents,total_cents FROM orders WHERE idempotency_key=?',(key,)).fetchone()
        if existing:
            db.execute('COMMIT')
            return {'order_id':existing['id'],'subtotal_cents':existing['subtotal_cents'],'tax_cents':existing['tax_cents'],'total_cents':existing['total_cents'],'already_placed':True}
        stock=stock_map(db)
        lacking=[(sku,qty,stock.get(sku,0)) for sku,qty in required.items() if stock.get(sku,0)<qty]
        if lacking:
            raise StockError('Insufficient stock: '+', '.join(f'{s} (need {needed}, available {have})' for s,needed,have in lacking),stock)
        for sku,qty in required.items():
            result=db.execute('UPDATE inventory SET on_hand=on_hand-?,updated_at=CURRENT_TIMESTAMP WHERE sku=? AND on_hand>=?',(qty,sku,qty))
            if result.rowcount!=1: raise StockError('Inventory changed. Please refresh and try again.',stock_map(db))
        db.execute('''INSERT INTO orders(id,idempotency_key,customer_name,email,phone,pickup_date,pickup_slot,notes,subtotal_cents,tax_cents,total_cents)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?)''', (oid,key,name,email,phone,pickup_date,pickup_slot,notes,subtotal,tax,total))
        for it in items:
            db.execute('''INSERT INTO order_items(order_id,label,quantity,unit_price_cents,recipe_json,options_json) VALUES(?,?,?,?,?,?)''',
                (oid,it['label'],it['qty'],it['unit_price'],json.dumps(it['recipe']),json.dumps(it['options'])))
        db.execute('COMMIT')
        return {'order_id':oid,'subtotal_cents':subtotal,'tax_cents':tax,'total_cents':total,'pickup_date':pickup_date,'pickup_slot':pickup_slot,'payment_mode':'pay_at_pickup'}
    except Exception:
        if db.in_transaction: db.execute('ROLLBACK')
        raise
    finally: db.close()


def create_quote(body):
    if not isinstance(body,dict): raise ValidationError('Invalid quote request.')
    entry={
        'name':safe_text(body.get('name'),'Name',100),
        'email':safe_email(body.get('email')),
        'phone':safe_phone(body.get('phone')),
        'event_type':safe_text(body.get('event_type'),'Event type',60),
        'event_date':safe_date(body.get('event_date'),'Event date',datetime.now(TZ).date()+timedelta(days=1),730),
        'arrangements':safe_text(body.get('arrangements'),'Arrangements',120),
        'budget':safe_text(body.get('budget'),'Budget',50),
        'palette':safe_text(body.get('palette'),'Colour palette',80),
        'message':safe_text(body.get('message',''),'Additional details',1200,0),
    }
    if entry['event_type'] not in ('Birthday','Wedding','Corporate','Baby shower','Graduation','Other'):
        raise ValidationError('Please choose a valid event type.')
    guests=body.get('guests')
    if type(guests) is not int or not 1<=guests<=5000: raise ValidationError('Please enter the estimated number of guests.')
    quantity=body.get('quantity')
    if type(quantity) is not int or not 1<=quantity<=300: raise ValidationError('Please enter between 1 and 300 floral pieces.')
    if body.get('consent') is not True: raise ValidationError('Please confirm that we can contact you about the event.')
    qid='EVT-'+secrets.token_hex(4).upper()
    with connect() as db:
        db.execute('''INSERT INTO event_quotes(id,name,email,phone,event_type,event_date,guests,quantity,arrangements,budget,palette,message)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?)''',(qid,entry['name'],entry['email'],entry['phone'],entry['event_type'],entry['event_date'],guests,quantity,entry['arrangements'],entry['budget'],entry['palette'],entry['message']))
    return {'quote_id':qid,'message':'We received your event request. Our team will review the details.'}


def admin_overview():
    with connect() as db:
        stock=[dict(r) for r in db.execute('SELECT sku,name,on_hand,unit,updated_at FROM inventory ORDER BY name')]
        orders=[]
        for o in db.execute('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100'):
            row=dict(o)
            row['items']=[{'label':r['label'],'quantity':r['quantity'],'unit_price_cents':r['unit_price_cents'],'options':json.loads(r['options_json'])} for r in db.execute('SELECT * FROM order_items WHERE order_id=?',(o['id'],))]
            orders.append(row)
        quotes=[dict(r) for r in db.execute('SELECT * FROM event_quotes ORDER BY created_at DESC LIMIT 100')]
    return {'stock':stock,'orders':orders,'quotes':quotes}


def adjust_stock(body):
    if not isinstance(body,dict): raise ValidationError('Invalid stock update.')
    sku=safe_text(body.get('sku'),'SKU',30)
    delta=body.get('delta')
    if type(delta) is not int or delta==0 or abs(delta)>10000: raise ValidationError('Stock adjustment must be a non-zero whole number.')
    reason=safe_text(body.get('reason'),'Adjustment reason',120,3)
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        row=db.execute('SELECT on_hand FROM inventory WHERE sku=?',(sku,)).fetchone()
        if not row: raise ValidationError('Unknown inventory item.')
        new=row['on_hand']+delta
        if new<0: raise ValidationError('Cannot reduce stock below zero.')
        db.execute('UPDATE inventory SET on_hand=?,updated_at=CURRENT_TIMESTAMP WHERE sku=?',(new,sku))
        db.execute('INSERT INTO inventory_audit(sku,change_qty,reason) VALUES(?,?,?)',(sku,delta,reason))
    return {'sku':sku,'on_hand':new}


def order_status(body):
    if not isinstance(body,dict): raise ValidationError('Invalid order status request.')
    order_id=safe_text(body.get('id'),'Order ID',40)
    status=safe_text(body.get('status'),'Status',30)
    if status not in ('confirmed','ready','collected','cancelled'): raise ValidationError('Invalid order status.')
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        old=db.execute('SELECT status FROM orders WHERE id=?',(order_id,)).fetchone()
        if not old: raise ValidationError('Order not found.')
        if old['status']=='cancelled' and status!='cancelled': raise ValidationError('Cancelled orders cannot be reopened. Create a new order.')
        if old['status']!='cancelled' and status=='cancelled':
            items=db.execute('SELECT quantity,recipe_json FROM order_items WHERE order_id=?',(order_id,)).fetchall()
            needed=Counter()
            for it in items:
                for sku,q in json.loads(it['recipe_json']).items(): needed[sku]+=q*it['quantity']
            for sku,qty in needed.items():
                db.execute('UPDATE inventory SET on_hand=on_hand+?,updated_at=CURRENT_TIMESTAMP WHERE sku=?',(qty,sku))
                db.execute('INSERT INTO inventory_audit(sku,change_qty,reason) VALUES(?,?,?)',(sku,qty,'Order cancellation '+order_id))
        db.execute('UPDATE orders SET status=? WHERE id=?',(status,order_id))
    return {'id':order_id,'status':status}


def quote_status(body):
    if not isinstance(body,dict): raise ValidationError('Invalid quote status request.')
    quote_id=safe_text(body.get('id'),'Quote ID',40)
    status=safe_text(body.get('status'),'Status',30)
    if status not in ('new','contacted','quoted','booked','closed'): raise ValidationError('Invalid quote status.')
    with connect() as db:
        updated=db.execute('UPDATE event_quotes SET status=? WHERE id=?',(status,quote_id))
        if updated.rowcount<1: raise ValidationError('Quote request not found.')
    return {'id':quote_id,'status':status}


def rate_ok(ip):
    now=time.monotonic()
    with RATE_LOCK:
        last=[t for t in RATE_BUCKETS.get(ip,[]) if now-t<60]
        if len(last)>=35: return False
        last.append(now)
        RATE_BUCKETS[ip]=last
        if len(RATE_BUCKETS)>2000:
            for k in list(RATE_BUCKETS)[:500]:
                if not any(now-t<60 for t in RATE_BUCKETS[k]): RATE_BUCKETS.pop(k,None)
        return True


class Handler(BaseHTTPRequestHandler):
    server_version='ALUSORA/1.0'
    def send_json(self, obj, status=200):
        data=json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('X-Frame-Options','DENY')
        self.end_headers()
        self.wfile.write(data)

    def send_static(self, path):
        target=(WEB / path.lstrip('/')).resolve()
        if not target.is_relative_to(WEB.resolve()) or not target.is_file():
            return self.send_json({'error':'Not found'},404)
        content=target.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type',MIME.get(target.suffix,'application/octet-stream'))
        self.send_header('Content-Length',str(len(content)))
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('X-Frame-Options','DENY')
        self.end_headers()
        self.wfile.write(content)

    def admin_auth(self):
        val=self.headers.get('Authorization','')
        authorized=bool(ADMIN_TOKEN) and hmac.compare_digest(val, 'Bearer '+ADMIN_TOKEN)
        if not authorized:
            self.send_json({'error':'Admin access requires a valid configured token.'},401 if ADMIN_TOKEN else 503)
        return authorized

    def read_body(self):
        try: n=int(self.headers.get('Content-Length','0'))
        except ValueError: raise ValidationError('Invalid content length.')
        if n<1 or n>50000: raise ValidationError('Request body must be smaller than 50 KB.')
        try: return json.loads(self.rfile.read(n))
        except (ValueError,UnicodeDecodeError): raise ValidationError('Invalid JSON data.')

    def do_GET(self):
        route=urlparse(self.path).path
        if route=='/api/catalog': return self.send_json(get_catalog())
        if route=='/api/admin/overview':
            if self.admin_auth(): return self.send_json(admin_overview())
            return
        if route=='/api/health': return self.send_json({'status':'ok'})
        if route=='/': route='/index.html'
        return self.send_static(route)

    def do_POST(self):
        route=urlparse(self.path).path
        if route not in ('/api/orders','/api/events','/api/admin/stock','/api/admin/order-status','/api/admin/quote-status'):
            return self.send_json({'error':'Not found'},404)
        if not rate_ok(self.client_address[0]): return self.send_json({'error':'Too many requests. Try again in a minute.'},429)
        if route.startswith('/api/admin/') and not self.admin_auth(): return
        try:
            data=self.read_body()
            if route=='/api/orders': output=create_order(data)
            elif route=='/api/events': output=create_quote(data)
            elif route=='/api/admin/stock': output=adjust_stock(data)
            elif route=='/api/admin/order-status': output=order_status(data)
            else: output=quote_status(data)
            self.send_json(output,201 if route in ('/api/orders','/api/events') else 200)
        except ValidationError as exc: self.send_json({'error':str(exc)},400)
        except StockError as exc: self.send_json({'error':str(exc),'current_stock':exc.available},409)
        except sqlite3.OperationalError as exc:
            print('DB error:',exc)
            self.send_json({'error':'Database is busy. Please retry.'},503)
        except Exception as exc:
            print('Server error:',repr(exc))
            self.send_json({'error':'Unexpected server error.'},500)

    def log_message(self, fmt, *args):
        print('%s - %s' % (self.address_string(),fmt%args))


if __name__=='__main__':
    init_database()
    if not ADMIN_TOKEN:
        print('NOTE: Admin features disabled. Set ALUSORA_ADMIN_TOKEN to a strong password before use.')
    print(f'ALUSORA running at http://{HOST}:{PORT}')
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
