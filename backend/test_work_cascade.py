import json
import os
import unittest

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import main
from database import SessionLocal
from fastapi import HTTPException


class WorkCascadeTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.db.query(main.models.Prospect).delete()
        sheets = [
            {"type": "Cocina", "materials": [{"qty": 1, "price": 10000}]},
            {"type": "Closet", "labor": [{"qty": 2, "price": 2500}]},
            {"type": "Puertas", "concepts": [{"qty": 3, "price": 1000}]},
        ]
        self.p = main.models.Prospect(
            name="Cliente prueba", public_id="TEST01", project_type="Cocina, Closet, Puertas",
            valuation_data=json.dumps({"sheets": sheets, "globalMargin": 30}),
            space_image_path="photo.jpg", is_contract=False, has_quote=False, status="Valoración",
        )
        self.db.add(self.p)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def action(self, action, ids, **extra):
        return main.work_cascade_action(self.p.id, main.WorkCascadeAction(action=action, ids=ids, **extra), self.db)

    def test_quote_only_selected_and_preserve_valuation(self):
        result = self.action("quote", ["work-2"])
        self.assertEqual(result["quote_total_price"], "6,500.00")
        self.assertEqual(len(json.loads(self.p.valuation_data)["sheets"]), 3)

    def test_pause_resume_delete_and_explicit_errors(self):
        self.action("quote", ["work-1", "work-2"])
        self.action("pause", ["work-1"])
        self.assertEqual(self.p.quote_total_price, "6,500.00")
        with self.assertRaises(HTTPException):
            self.action("quote", ["work-1"])
        self.action("resume", ["work-1"])
        self.action("delete", ["work-3"])
        with self.assertRaises(HTTPException):
            self.action("quote", ["work-3"])
        self.assertEqual(json.loads(self.p.work_flow)["items"]["work-3"]["status"], "DELETED")

    def test_partial_approval_and_second_batch(self):
        self.action("quote", ["work-1", "work-2"])
        first = self.action("approve", ["work-2"])
        child = self.db.get(main.models.Prospect, first["client_id"])
        self.assertTrue(child.is_contract)
        self.assertFalse(self.p.is_contract)
        self.assertEqual(child.source_prospect_id, self.p.id)
        self.assertEqual(child.project_type, "Closet")
        self.assertEqual(child.quote_total_price, "6,500.00")
        self.assertEqual(child.space_image_path, "photo.jpg")
        self.assertEqual(len(json.loads(child.valuation_data)["sheets"]), 1)
        self.assertEqual(json.loads(self.p.work_flow)["quoted"], ["work-1"])
        self.assertEqual(self.p.quote_total_price, "13,000.00")
        with self.assertRaises(HTTPException):
            self.action("approve", ["work-2"])
        self.action("quote", ["work-3"])
        second = self.action("approve", ["work-3"])
        self.assertNotEqual(first["client_id"], second["client_id"])
        self.assertEqual(self.db.get(main.models.Prospect, second["client_id"]).project_type, "Puertas")
        self.assertEqual(len(json.loads(self.p.valuation_data)["sheets"]), 3)

    def test_cannot_approve_uncotized_or_invalid_ids(self):
        self.action("quote", ["work-1"])
        for ids in (["work-2"], ["work-99"], ["work-1", "work-1"], []):
            with self.assertRaises(HTTPException):
                self.action("approve", ids)
        self.assertEqual(self.db.query(main.models.Prospect).count(), 1)

    def test_legacy_quote_can_be_partially_approved(self):
        self.p.has_quote = True
        self.db.commit()
        result = self.action("approve", ["work-1"])
        self.assertIsNotNone(result["client_id"])
        self.assertEqual(json.loads(self.p.work_flow)["quoted"], ["work-2", "work-3"])

    def test_delete_valuation_preserves_legacy_quote_and_sheet_identity(self):
        self.p.has_quote = True
        self.db.commit()
        result = self.action("delete", ["work-2"])
        self.assertTrue(result["has_quote"])
        self.assertEqual(result["quote_total_price"], "16,900.00")
        self.assertEqual(float(result["estimated_price"]), 16900)
        self.assertEqual(json.loads(result["work_flow"])["quoted"], ["work-1", "work-3"])
        self.assertEqual(len(json.loads(self.p.valuation_data)["sheets"]), 3)
        self.assertNotIn("Closet", result["quote_description"])
        with self.assertRaises(HTTPException):
            self.action("approve", ["work-2"])
        child = self.action("approve", ["work-3"])
        self.assertEqual(self.db.get(main.models.Prospect, child["client_id"]).project_type, "Puertas")
        with self.assertRaises(HTTPException):
            self.action("delete", ["work-3"])

    def test_delete_last_pending_valuation_keeps_history_and_clears_quote(self):
        self.action("quote", ["work-1", "work-2", "work-3"])
        result = self.action("delete", ["work-1", "work-2", "work-3"])
        self.assertFalse(result["has_quote"])
        self.assertIsNone(result["quote_total_price"])
        self.assertEqual(float(result["estimated_price"]), 0)
        self.assertEqual(len(json.loads(self.p.valuation_data)["sheets"]), 3)
        with self.assertRaises(HTTPException):
            self.action("delete", ["work-1"])

    def test_quote_fields_are_saved_atomically(self):
        self.action("quote", ["work-1"], quote_fields={"quote_anticipo": "70", "quote_description": "Solo cocina"})
        self.assertEqual(self.p.quote_description, "Solo cocina")
        self.assertEqual(self.p.quote_anticipo, "70")

    def test_mismatched_estimation_prevents_partial_transfer(self):
        self.action("quote", ["work-1"])
        self.p.estimation_data = json.dumps({"sheets": [{"type": "Other"}]})
        self.db.commit()
        with self.assertRaises(HTTPException):
            self.action("approve", ["work-1"])
        self.assertEqual(self.db.query(main.models.Prospect).count(), 1)

    def test_reordering_tracked_sheets_is_blocked(self):
        self.action("quote", ["work-1"])
        raw = json.loads(self.p.valuation_data)
        raw["sheets"].reverse()
        with self.assertRaises(HTTPException):
            main.update_prospect(self.p.id, main.ProspectUpdate(valuation_data=json.dumps(raw)), self.db)

    def test_reordering_duplicate_named_sheets_is_blocked_by_stable_sheet_ids(self):
        raw = json.loads(self.p.valuation_data)
        raw["sheets"][1]["type"] = raw["sheets"][0]["type"]
        raw["sheets"][2]["type"] = raw["sheets"][0]["type"]
        self.p.valuation_data = json.dumps(raw)
        self.db.commit()

        self.action("quote", ["work-1"])
        tracked = json.loads(self.p.valuation_data)
        sheet_ids = [sheet["work_id"] for sheet in tracked["sheets"]]
        self.assertEqual(len(set(sheet_ids)), 3)

        tracked["sheets"].reverse()
        with self.assertRaises(HTTPException) as context:
            main.update_prospect(self.p.id, main.ProspectUpdate(valuation_data=json.dumps(tracked)), self.db)
        self.assertEqual(context.exception.status_code, 409)

        self.p.valuation_data = json.dumps(tracked)
        self.db.commit()
        with self.assertRaises(HTTPException) as context:
            self.action("quote", ["work-1"])
        self.assertEqual(context.exception.status_code, 409)

    def test_selected_estimation_does_not_carry_unapproved_scope(self):
        self.p.estimation_data = json.dumps({
            "sheets": json.loads(self.p.valuation_data)["sheets"],
            "margin": 30, "obsText": "Cocina, Closet y Puertas"
        })
        self.db.commit()
        self.action("quote", ["work-2"])
        result = self.action("approve", ["work-2"])
        child = self.db.get(main.models.Prospect, result["client_id"])
        estimate = json.loads(child.estimation_data)
        self.assertEqual(len(estimate["sheets"]), 1)
        self.assertEqual(estimate["totalWithMargin"], 6500)
        self.assertEqual(estimate["obsText"], "Fabricación e instalación de: Closet.")


if __name__ == "__main__":
    unittest.main()
