import os
import sys
import tempfile
import threading
import unittest
from datetime import datetime,timedelta
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
import app


class ALUSORAStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        app.DB_PATH=Path(self.tmp.name)/'test.db'
        app.init_database()

    def tearDown(self):
        self.tmp.cleanup()

    def order(self,key='key_abcdefghijklmnopqrstuvwxyz123',qty=1):
        pickup=(datetime.now(app.TZ).date()+timedelta(days=2)).isoformat()
        return {'name':'Example Customer','email':'example@example.com','phone':'519-555-0199',
          'pickup_date':pickup,'pickup_slot':'1:00 PM','notes':'Happy birthday!',
          'idempotency_key':key,'items':[{'id':'cozy-hello','qty':qty}]}

    def quote(self):
        return {'name':'Example Person','email':'person@example.com','phone':'519-555-0198',
         'event_type':'Wedding','event_date':(datetime.now(app.TZ).date()+timedelta(days=40)).isoformat(),
         'guests':60,'quantity':8,'arrangements':'Table centrepieces','budget':'$600–$1,000',
         'palette':'Blush & cream','message':'Eight small table arrangements','consent':True}

    def test_order_deducts_exact_recipe(self):
        before=app.get_catalog()['stock']
        result=app.create_order(self.order())
        after=app.get_catalog()['stock']
        self.assertEqual(result['subtotal_cents'],1499)
        self.assertEqual(result['tax_cents'],195)
        self.assertEqual(before['carnation']-after['carnation'],3)
        self.assertEqual(before['alstro']-after['alstro'],1)
        self.assertEqual(before['wrap']-after['wrap'],1)

    def test_idempotent_retry_does_not_deduct_twice(self):
        first=app.create_order(self.order())
        stock=app.get_catalog()['stock']
        second=app.create_order(self.order())
        self.assertEqual(first['order_id'],second['order_id'])
        self.assertEqual(stock,app.get_catalog()['stock'])

    def test_cancel_restores_materials_once(self):
        before=app.get_catalog()['stock']
        result=app.create_order(self.order())
        app.order_status({'id':result['order_id'],'status':'cancelled'})
        app.order_status({'id':result['order_id'],'status':'cancelled'})
        self.assertEqual(before,app.get_catalog()['stock'])

    def test_concurrent_orders_cannot_oversell(self):
        with app.connect() as db:
            db.execute("UPDATE inventory SET on_hand=3 WHERE sku='carnation'")
        results=[]
        def submit(idx):
            try: results.append(('yes',app.create_order(self.order('unique_key_concurrent_test_'+str(idx)))))
            except app.StockError as exc:results.append(('no',str(exc)))
        t1=threading.Thread(target=submit,args=(1,)); t2=threading.Thread(target=submit,args=(2,))
        t1.start();t2.start();t1.join();t2.join()
        self.assertEqual(sorted(x[0] for x in results),['no','yes'])
        self.assertEqual(app.get_catalog()['stock']['carnation'],0)

    def test_quote_does_not_reserve_stock(self):
        stock=app.get_catalog()['stock']
        quote=app.create_quote(self.quote())
        self.assertTrue(quote['quote_id'].startswith('EVT-'))
        self.assertEqual(stock,app.get_catalog()['stock'])
        self.assertEqual(len(app.admin_overview()['quotes']),1)

    def test_custom_pricing_from_server(self):
        choice={'stems':{'rose':3,'carnation':2},'palette':'Blush & cream','finish':'vase'}
        info=app.custom_bouquet(choice)
        self.assertEqual(info['unit_price'],599+3*625+2*325+1000)
        self.assertEqual(info['recipe']['vase'],1)
        self.assertNotIn('wrap',info['recipe'])

    def test_invalid_bouquet_blocked(self):
        with self.assertRaises(app.ValidationError):
            app.custom_bouquet({'stems':{'rose':200},'finish':'vase','palette':'Blush & cream'})

    def test_negative_stock_blocked(self):
        with self.assertRaises(app.ValidationError):
            app.adjust_stock({'sku':'rose','delta':-100,'reason':'Damaged'})

if __name__ == '__main__':unittest.main()
