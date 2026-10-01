from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Date
from database import Base
import datetime

class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, index=True)
    project_type = Column(String, nullable=True)
    project_type_other = Column(String, nullable=True)
    restoration_details = Column(String, nullable=True)
    amount = Column(Float)
    date = Column(DateTime, default=datetime.datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, index=True)
    project_type = Column(String, nullable=True)
    project_type_other = Column(String, nullable=True)
    restoration_details = Column(String, nullable=True)
    status = Column(String, default="Pending")
    total = Column(Float)

class Prospect(Base):
    __tablename__ = "prospects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    project_type = Column(String, nullable=True)
    project_type_other = Column(String, nullable=True)
    restoration_details = Column(String, nullable=True)
    kitchen_layout = Column(String, nullable=True)
    kitchen_addons = Column(String, nullable=True)
    closet_layout = Column(String, nullable=True)
    closet_addons = Column(String, nullable=True)
    kitchen_measurements = Column(String, nullable=True)
    kitchen_island_measurements = Column(String, nullable=True)
    kitchen_peninsula_measurements = Column(String, nullable=True)
    closet_measurements = Column(String, nullable=True)
    closet_island_measurements = Column(String, nullable=True)
    closet_vanity_measurements = Column(String, nullable=True)
    door_solid_measurements = Column(String, nullable=True)
    door_tambor_measurements = Column(String, nullable=True)
    restoration_measurements = Column(String, nullable=True)
    other_measurements = Column(String, nullable=True)
    contact_info = Column(String, index=True, nullable=True)
    location = Column(String, nullable=True)
    project_priorities = Column(String, nullable=True)
    expectations = Column(String, nullable=True)
    has_design = Column(Boolean, default=False)
    design_details = Column(String, nullable=True)
    design_image_path = Column(String, nullable=True)  # path to uploaded image (legacy)
    space_image_path = Column(String, nullable=True)   # foto del espacio
    reference_image_path = Column(String, nullable=True) # foto de referencia
    measurements = Column(String, nullable=True)
    hardware_details = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    delivery_date = Column(Date, nullable=True)
    material_type = Column(String, nullable=True)
    material_type_2 = Column(String, nullable=True)
    furniture_color = Column(String, nullable=True)
    countertop_type = Column(String, nullable=True)
    inhabited_house = Column(String, nullable=True)
    how_found = Column(String, nullable=True)
    valuation_data = Column(String, nullable=True)

    interior_color_type = Column(String, nullable=True)
    interior_color_code = Column(String, nullable=True)
    exterior_inf_color_type = Column(String, nullable=True)
    exterior_inf_color_code = Column(String, nullable=True)
    exterior_sup_color_type = Column(String, nullable=True)
    exterior_sup_color_code = Column(String, nullable=True)
    estimated_price = Column(String, nullable=True)
    production_days = Column(Integer, nullable=True)
    public_id = Column(String, unique=True, index=True, nullable=True)
    capture_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="New")
    has_quote = Column(Boolean, default=False)
    is_contract = Column(Boolean, default=False)   # passed to Contratos
    is_papelera = Column(Boolean, default=False)   # rejected, goes to Papelera
    contract_date = Column(DateTime, nullable=True)
    estimation_data = Column(String, nullable=True)  # JSON from Estimación
    render_applies = Column(Boolean, nullable=True)   # True=SI, False=NO
    render_price = Column(Float, nullable=True)       # Precio del render
    render_total_price = Column(Float, nullable=True) # Estimación + Render
    render_image_path = Column(String, nullable=True) # Imagen del render cargada
    render_delivery_time = Column(String, nullable=True) # Tiempo de entrega del render
    render_comments = Column(String, nullable=True)      # Comentarios / Observaciones
    quote_saludo = Column(String, nullable=True)
    quote_title = Column(String, nullable=True)
    quote_description = Column(String, nullable=True)
    quote_total_price = Column(String, nullable=True)
    quote_delivery_time = Column(String, nullable=True)
    quote_validez = Column(String, nullable=True)
    quote_anticipo = Column(String, nullable=True)
    quote_image_1 = Column(String, nullable=True)
    quote_image_2 = Column(String, nullable=True)
    quote_image_3 = Column(String, nullable=True)
    quote_image_4 = Column(String, nullable=True)

class Template(Base):
    __tablename__ = 'templates'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    data = Column(String)

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="Ventas")
    status = Column(String, default="Activo")
    permissions = Column(String) # JSON string of permissions

