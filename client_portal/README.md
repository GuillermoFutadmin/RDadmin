# Client portal service

The client portal runs as a separate web service from the RDadmin staff app. It serves the standalone `frontend/client.html` build and exposes only `POST /api/client-portal/login` and `GET /health`.

## Railway service

Create a second Railway service from this repository. Keep its root directory at the repository root and configure:

- Build command: `pip install -r requirements.txt && cd frontend && npm ci && npm run build -- --config vite.client.config.js`
- Start command: `uvicorn client_portal.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`
- `CLIENT_PORTAL_DATABASE_URL`: connection string for a dedicated PostgreSQL role with read-only access to the listed `prospects` columns.
- `RDADMIN_PUBLIC_URL`: public base URL of RDadmin, needed to show locally stored `/uploads/` project photos. Cloudinary URLs are used directly.

Set `VITE_CLIENT_PORTAL_URL` on the staff app's build environment to the public URL assigned to this second service. The staff login screen will then show a customer-portal link without routing customer API traffic through the staff server.

The portal service uses a connection pool limited to three connections per process and only issues a query for the fields needed by the portal. Open client sessions refresh every 30 seconds and when the browser returns to the foreground. Do not point it at the staff service's unrestricted database credentials.

An administrator can provision the database role once on PostgreSQL (replace the role name and password before running):

```sql
CREATE ROLE rdadmin_client_portal LOGIN PASSWORD 'use-a-unique-secret';
GRANT CONNECT ON DATABASE rdadmin TO rdadmin_client_portal;
GRANT USAGE ON SCHEMA public TO rdadmin_client_portal;
GRANT SELECT (
  id, public_id, contract_password, name, project_type, project_type_other,
  restoration_details, quote_description, project_priorities, expectations,
  capture_date, contract_date, delivery_date, status, is_contract, has_quote,
  valuation_data, production_data
) ON prospects TO rdadmin_client_portal;
```

The separate app process isolates client HTTP requests from staff HTTP requests. Both services still read the same PostgreSQL database; use a read replica if database read load itself becomes a bottleneck.
