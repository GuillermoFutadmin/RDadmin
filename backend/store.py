from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, String
from database import Base, engine, get_db
from pydantic import BaseModel

class AppStore(Base):
    __tablename__ = "app_store"
    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=True)

AppStore.__table__.create(bind=engine, checkfirst=True)

router = APIRouter(prefix="/api/store", tags=["store"])

class StoreItem(BaseModel):
    key: str
    value: str

@router.get("/{key}")
def get_store_item(key: str, db: Session = Depends(get_db)):
    item = db.query(AppStore).filter(AppStore.key == key).first()
    if not item:
        return {"key": key, "value": None}
    return {"key": key, "value": item.value}

@router.post("/")
def set_store_item(item: StoreItem, db: Session = Depends(get_db)):
    db_item = db.query(AppStore).filter(AppStore.key == item.key).first()
    if db_item:
        db_item.value = item.value
    else:
        db_item = AppStore(key=item.key, value=item.value)
        db.add(db_item)
    db.commit()
    return {"success": True}
