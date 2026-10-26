import json
import os
import unittest

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import main
from database import SessionLocal
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient
from web_security import sensitive_path


class SecurityFixTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.db.query(main.models.User).delete()
        self.db.query(main.models.Prospect).delete()
        self.user = main.models.User(name="Test", username="test", status="Activo", permissions="[]")
        self.project = main.models.Prospect(name="Test", public_id="SEC01", is_contract=False)
        self.db.add_all([self.user, self.project])
        self.db.commit()
        self.request = Request({"type": "http", "state": {"user_id": self.user.id}})

    def tearDown(self):
        self.db.rollback()
        self.db.close()

    def test_no_module_permission_denies_sensitive_operations(self):
        for operation in (
            lambda: main.work_cascade_action(self.project.id, main.WorkCascadeAction(action="delete", ids=["work-1"]), self.db, self.request),
            lambda: main.update_production_work_stage(self.project.id, "work-1", main.ProductionWorkStageUpdate(current_stage=5), self.db, self.request),
            lambda: main.update_prospect(self.project.id, main.ProspectUpdate(status="ENTREGADO"), self.db, self.request),
        ):
            with self.assertRaises(HTTPException) as context:
                operation()
            self.assertEqual(context.exception.status_code, 403)

    def test_approving_quoted_work_requires_contract_permission(self):
        self.user.permissions = '["prospectos"]'
        self.db.commit()
        with self.assertRaises(HTTPException) as context:
            main.work_cascade_action(
                self.project.id,
                main.WorkCascadeAction(action="approve", ids=["work-1"]),
                self.db,
                self.request,
            )
        self.assertEqual(context.exception.status_code, 403)

    def test_prospect_permission_cannot_bypass_production_via_generic_update(self):
        self.user.permissions = '["prospectos"]'
        self.db.commit()
        with self.assertRaises(HTTPException) as context:
            main.update_prospect(self.project.id, main.ProspectUpdate(production_data='{}'), self.db, self.request)
        self.assertEqual(context.exception.status_code, 403)
        main.update_prospect(self.project.id, main.ProspectUpdate(name="Allowed"), self.db, self.request)
        self.assertEqual(self.project.name, "Allowed")

    def test_inactive_user_and_revoked_permissions_rejected(self):
        self.user.permissions = '["pedidos"]'
        self.db.commit()
        main.auth.require_modules(self.request, self.db, "pedidos", "produccion")
        self.user.permissions = "[]"
        self.db.commit()
        with self.assertRaises(HTTPException):
            main.auth.require_modules(self.request, self.db, "pedidos")
        self.user.status = "Inactivo"
        with self.assertRaises(HTTPException) as context:
            main.auth.require_modules(self.request, self.db, "pedidos")
        self.assertEqual(context.exception.status_code, 401)

    def test_sensitive_paths_and_security_headers(self):
        for path in ("/.git/HEAD", "/.git/config", "/%2egit/config", "/.env", "/assets/.git/config", "/..\\backend\\auth.py"):
            self.assertTrue(sensitive_path(path), path)
        client = TestClient(main.app)
        try:
            for path in ("/.git/HEAD", "/.git/config", "/.env"):
                self.assertEqual(client.get(path).status_code, 404)
            response = client.get("/health")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        finally:
            client.close()


if __name__ == "__main__":
    unittest.main()
