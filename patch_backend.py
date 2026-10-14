import sys
path = r'd:\RDadmin\backend\main.py'
with open(path, encoding='utf-8') as f:
    content = f.read()

# 1. Update upload_to_storage for resource_type='auto'
old_upload = 'result = cloudinary.uploader.upload(io.BytesIO(contents), public_id=unique_name, folder="rdadmin")'
new_upload = 'result = cloudinary.uploader.upload(io.BytesIO(contents), public_id=unique_name, folder="rdadmin", resource_type="auto")'
content = content.replace(old_upload, new_upload)

# 2. Add new DB migrations
old_migs = 'safe_alter("ALTER TABLE prospects ADD COLUMN render_image_path VARCHAR;")'
new_migs = '''safe_alter("ALTER TABLE prospects ADD COLUMN render_image_path VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_delivery_time VARCHAR;")
    safe_alter("ALTER TABLE prospects ADD COLUMN render_comments VARCHAR;")'''
content = content.replace(old_migs, new_migs)

# 3. Add to ProspectCreate schema
old_schema = '''    render_applies: Optional[bool] = None
    render_price: Optional[float] = None
    render_total_price: Optional[float] = None
    render_image_path: Optional[str] = None'''
new_schema = '''    render_applies: Optional[bool] = None
    render_price: Optional[float] = None
    render_total_price: Optional[float] = None
    render_image_path: Optional[str] = None
    render_delivery_time: Optional[str] = None
    render_comments: Optional[str] = None'''
content = content.replace(old_schema, new_schema)

# 4. Add the upload-render endpoint
new_endpoint = '''@app.post("/api/prospects/{prospect_id}/upload-render")
async def upload_render_file(prospect_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect: raise HTTPException(status_code=404, detail="Prospect not found")

    new_url = await upload_to_storage(file, "render")
    db_prospect.render_image_path = new_url
    db.commit()
    db.refresh(db_prospect)
    return {"image_path": db_prospect.render_image_path}
'''
if 'upload-render' not in content:
    content = content + '\n' + new_endpoint

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated main.py")
