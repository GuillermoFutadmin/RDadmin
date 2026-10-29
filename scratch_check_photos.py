import json
from sqlalchemy import create_engine, text

engine = create_engine("postgresql+psycopg://postgres:Gd012354R1.@localhost:5432/rdadmin")

with engine.connect() as conn:
    res = conn.execute(text("SELECT id, public_id, name, status, is_contract, is_papelera, production_data, contract_work_item_ids FROM prospects WHERE public_id ILIKE '%BXU81X%' OR name ILIKE '%Purbea%' ORDER BY id DESC")).fetchall()
    for row in res:
        print(f"ID: {row.id}, PublicID: {row.public_id}, Name: {row.name}, Status: {row.status}, is_contract: {row.is_contract}")
        try:
            pdata = json.loads(row.production_data or '{}')
            print("  started_at:", pdata.get("started_at"))
            print("  daily_advances:", len(pdata.get("daily_advances", [])))
            for adv in pdata.get("daily_advances", []):
                print("    daily:", adv.get("id"), adv.get("date"), adv.get("url")[:40] if adv.get("url") else None, "pub:", adv.get("published"), "stage:", adv.get("stage"))
            stages = pdata.get("stages", [])
            print("  stages count:", len(stages))
            for i, st in enumerate(stages):
                photos = st.get("photos", [])
                if photos:
                    print(f"    stage {i} ({st.get('name')}): {len(photos)} photos")
                    for p in photos:
                        print("      photo:", p[:60] if isinstance(p, str) else p)
            work_items = pdata.get("work_items", [])
            print("  work_items count:", len(work_items))
            for wi in work_items:
                print(f"    WI ID: {wi.get('id')}, Name: {wi.get('name')}, Status: {wi.get('status')}")
                wiprod = wi.get("production_data") or {}
                if isinstance(wiprod, str):
                    try: wiprod = json.loads(wiprod)
                    except: wiprod = {}
                print("      WI daily_advances:", len(wiprod.get("daily_advances", [])))
                for adv in wiprod.get("daily_advances", []):
                    print("        WI daily:", adv.get("id"), adv.get("date"), adv.get("url")[:40] if adv.get("url") else None, "pub:", adv.get("published"), "stage:", adv.get("stage"))
                wistages = wiprod.get("stages", [])
                for i, st in enumerate(wistages):
                    photos = st.get("photos", [])
                    if photos:
                        print(f"        WI stage {i} ({st.get('name')}): {len(photos)} photos")
                        for p in photos:
                            print("          photo:", p[:60] if isinstance(p, str) else p)
        except Exception as e:
            print("  Error parsing production_data:", e)
        print("-" * 50)
